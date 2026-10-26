---
title: Minimizing query costs
description: Practical tips for minimizing the cost of querying the HTTP Archive dataset
---

The HTTP Archive dataset is large and complex, and it's easy to write queries that are slow and expensive. All BigQuery users have a free quota of 1 TB per month. To stretch your free quota as far as possible, you'll want to minimize the amount of data that your queries scan. This guide provides some practical tips for minimizing the cost of querying the HTTP Archive dataset.

## Use cluster columns

Table | Partitioned by | Clustered by
--- | --- | ---
`httparchive.crawl.pages` | `date` | 1.`client`<br>2.`is_root_page`<br>3.`rank`<br>4.`page`
`httparchive.crawl.requests` | `date` | 1.`client`<br>2.`is_root_page`<br>3.`type`<br>4.`rank`

For example, the `httparchive.crawl.pages` table is [partitioned](https://cloud.google.com/bigquery/docs/partitioned-tables) by `date` and [clustered](https://cloud.google.com/bigquery/docs/clustered-tables) by the `client`, `is_root_page`, `rank` and `page` columns, which means that queries that filter on these columns will be much faster and cheaper than queries that don't.

:::caution
[Cluster column ordering](https://docs.cloud.google.com/bigquery/docs/clustered-tables#cluster_column_ordering) is important. BigQuery can take full advantage of clustering if the query filters on the clustered columns in the order they are defined. For example, a query that filters on `client` and `is_root_page` will be able to take full advantage of clustering, but a query that filters on `page` will not be able to take full advantage (but will still be considerably quicker/cheaper than a query that does not use any clustered columns).
BigQuery [doesn't guarantee](https://cloud.google.com/bigquery/docs/clustered-tables#clustered_table_pricing:~:text=BigQuery%20might%20not%20be%20able%20to%20accurately%20estimate%20the%20bytes%20to%20be%20processed) accuracy of estimations for 'Bytes processed' when querying clustered tables. In practice, estimates for the HTTP Archive tables now account for clustering, including filters on `rank`, and closely match the bytes actually processed.
:::

:::tip
Check the estimate before running a query. The BigQuery console shows "This query will process … when run" above the editor, and `bq query --dry_run` prints the same figure from the command line. Both are free. Table sizes grow every month, so check the estimate rather than relying on the figures in this guide.
:::

:::tip
Filter by the top 1k websites. This is the smallest rank bucket and will result in the smallest sample of data being scanned.

```sql
SELECT
  page
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop' AND
  rank <= 1000
```

:::

:::tip
Use the `type` column for `requests` table as often you may only be interested in `html` and `script` contents but not `css` for example.

```sql
SELECT
  page
FROM
  `httparchive.crawl.requests`
WHERE
  date = '2023-05-01' AND
  client = 'desktop' AND
  rank <= 1000 AND
  type IN ('html', 'script')
```

This is particularly relevant if using the `response_bodies` or `payload` columns. But these are large columns so try to avoid using them where at all possible. Also note that binary response bodies (e.g. images and fonts) are not stored, so these are mostly `html`, `script`, and `css` so selecting all three of those will not save much.
:::

## Use the `RECORD` columns

Some of our columns in the table are structured `RECORD` columns. When querying these you only pay for the costs of the records needed.

```sql
SELECT
  custom_metrics
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop' AND
  rank <= 1000
```

This query reads every `custom_metrics` column.

The same query looking at just the `a11y` custom metrics reads only that one column, at a small fraction of the cost:

```sql
SELECT
  custom_metrics.a11y
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop' AND
  rank <= 1000
```

## Use `TABLESAMPLE`

The `TABLESAMPLE` clause allows you to sample a table without scanning the entire table. This is useful for getting a rough idea of the data in a table before running a more expensive query.

For example, without `TABLESAMPLE`:

```sql
SELECT
  custom_metrics.other.avg_dom_depth
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop'
```

This query reads the column for every desktop page in the month, which is hundreds of gigabytes.

The same query with `TABLESAMPLE` at 0.01% is much cheaper:

```sql
SELECT
  custom_metrics.other.avg_dom_depth
FROM
  `httparchive.crawl.pages` TABLESAMPLE SYSTEM (0.01 PERCENT)
WHERE
  date = '2023-05-01' AND
  client = 'desktop'
```

This query reads only a small fraction of that.

The 0.01% of rows that are sampled are chosen randomly, so the results of the query will be different each time it's run.

:::danger
## Don't rely on LIMIT
Don't rely on the `LIMIT` clause to reduce the amount of data scanned. `LIMIT` is applied after the query is run, so the entire table will still be scanned.

For example, this query still processes the same bytes as the query without `LIMIT`:

```sql
SELECT
  custom_metrics.other.avg_dom_depth
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop'
LIMIT
  1
```

:::

## Use RANK

An alternative to `TABLESAMPLE`, to get a consistent set of data returning for a subset of data, is to use the `rank` column as mentioned previously. For the top 1,000 or even 10,000 sites:

```sql
SELECT
  custom_metrics.other.avg_dom_depth
FROM
  `httparchive.crawl.pages`
WHERE
  date = '2023-05-01' AND
  client = 'desktop' AND
  rank <= 1000
```

This consistency is an advantage over `TABLESAMPLE`, and the estimate reflects the `rank` filter, so you can see the cost before running. Raise the limit (for example to `rank <= 10000`) and check the estimate again before moving to a full run.

:::note
Older versions of this guide warned that estimates for `rank` filters were inaccurate because of a [BigQuery bug](https://issuetracker.google.com/issues/176795805). The estimates now reflect the `rank` filter.
:::

## Use the `sample_data` dataset

The `sample_data` dataset contains 10k subsets of the full pages and requests tables. These tables are useful for testing queries before running them on the full dataset, without the risk of incurring a large query cost.

Table names correspond to their full-size counterparts of the form `[table]_10k` for `crawl.pages` and `crawl.requests` tables. For example, to query the summary data for the subset of 10k pages, you would use the `httparchive.sample_data.pages_10k` table.

As `rank` is part of the clustering of the tables, you don't need the `sample_data` dataset to keep costs down. It is still useful as a small, fixed set of pages for developing query logic. The tables are rebuilt with each crawl and hold only the latest month.

## Whether to use `TABLESAMPLE`, `rank`, or `sample_data`

This comes down largely to a matter of personal preference. Each has their advantage and disadvantage.

Advantage|`TABLESAMPLE`|`rank`|`sample_data`
----|---|---|---
Consistency of results returned|❌|✅|✅ (if run in same month)
Accurate estimates|✅|✅|✅
Ease of commenting out for full run|✅|✅|❌
Allows querying of any months|✅|✅|❌ (previous month only)
Allows variable sample size|✅|✅|❌

With accurate estimates, `rank` is usually the best choice: consistent results, any month, and easy to remove for the full run. Use `TABLESAMPLE` when you need a random sample instead of the most popular sites.

## Use table previews

BigQuery allows you to preview entire rows of a table without incurring a query cost. This is useful for getting a rough idea of the data in a table before running a more expensive query.

![Preview tab on BigQuery](./bq-preview.webp)

To access the preview, click on a table name from the workspace explorer and select the **Preview** tab.

Note that generating the preview may be slow for these tables as they include large payloads. Also note that the text values are truncated by default, so you will need to expand the field to get the full value.
