**HTTP Archive - Guided Tour**
----------------------

The HTTP Archive contains a tremendous amount of information that can be used to understand the evolution of the web. And since the raw data is available in Google BigQuery, you can start digging into it with a minimal amount of setup!

If you are new to BigQuery, then the [Getting Started guide](./gettingstarted_bigquery.md) will walk you through the basic setup. That guide ends with a sample query that explores MIME types from the `summary_pages` tables. In this guide, we'll explore more of the tables and build additional queries that you can learn from. The easiest way to get started is by following along, testing some of the queries and learning from them. If you need any help then there is plenty of support available from the community at [https://discuss.httparchive.org](https://discuss.httparchive.org).

*Prerequisites: This guide assumes that you've completed the setup from the [Getting Started guide](./gettingstarted_bigquery.md). It also assumes some familiarity with SQL. All of the examples provided will be using [Standard SQL](https://cloud.google.com/bigquery/docs/reference/standard-sql/). If you are looking to adapt older HTTP Archive queries, written in [Legacy SQL](https://cloud.google.com/bigquery/docs/reference/legacy-sql), then you may find this [migration guide](https://cloud.google.com/bigquery/docs/reference/standard-sql/migrating-from-legacy-sql) helpful.*

This guide is split into multiple sections, each one focusing on different tables in the HTTP Archive. Each section builds on top of the previous one.

1. [Exploring the Summary Pages Tables](./guided_tour_summary_pages.md)
2. [Exploring the Summary Requests Tables](./guided_tour_summary_requests.md)
3. [JOINing Summary_Pages and Summary_Requests Tables](./guided_tour_summary_pages_requests.md)
4. Exploring the Pages Tables (Coming Soon)
5. Exploring the Requests Tables (Coming Soon)
6. Exploring the Lighthouse Tables (Coming Soon)
7. Exploring the Response Bodies Tables (Coming Soon)
