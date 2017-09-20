# Reports

A _report_ is a collection of similar metrics. Reports may span multiple crawls, in which case the data is visualized as a timeseries. Reports may also focus on one snapshot of a particular crawl, in which case the data is visualized as a histogram.

## JSON Generation

After each crawl, the [generateReports.sh](../sql/generateReports.sh) script is run with the date of the crawl. For example:

```sh
sql/generateReports.sh -t -h 2017_09_01
```

This will generate timeseries and histogram reports for all metrics using predefined SQL queries. The histogram queries will fill table placeholders with the crawl date provided. For example:

```sql
SELECT ... FROM `httparchive.runs.${YYYY_MM_DD}_pages* ...`
```

will become

```sql
SELECT ... FROM `httparchive.runs.2017_09_01_pages* ...`
```

After executing the histogram/timeseries queries for each metric on BigQuery, the results will be saved as JSON on Google Storage. For example, the `bytesJS` histogram would be saved to `gs://httparchive/reports/2017_09_01/bytesJS.json`. The timeseries for the same metric would be saved to `gs://httparchive/reports/bytesJS.json`.

### Running Manually

Sometimes it's necessary to manually run this process, for example if a new metric is added or specific dates need to be backfilled. The generateReports.sh script can be run with a different configuration of flags depending on your needs. From the script's documentation:

```sh
# Flags:
#
#   -t: Whether to generate timeseries.
#
#   -h: Whether to generate histograms. Must be accompanied by the date to query.
#
#   -f: Whether to force histogram querying and updating even if the data exists.
#       Timeseries are always overwritten.
```

You can omit one of the `-t` or -h` flags to focus only on histogram or timeseries generation. The `-f` flag ensures that histogram data gets overwritten. Omit this flag to skip queries for dates that already exist (much faster for batch jobs, see below).

### Getting Dates Dynamically

If you're adding a new metric, it would be a pain to run the generation script manually for each date. HTTP Archive has over 300 crawls worth of dated tables in BigQuery! The [getBigQueryDates.sh](../sql/getBigQueryDates.sh) script can be used to get all of the dates in `YYYY_MM_DD` format for a particular table type. For example, if your new metric depends on the `pages` tables of the `runs` dataset (eg `httparchive.runs.2017_09_01_pages`), you could get the dates representing all of the matiching tables by running this command:

```sh
sql/getBigQueryDates.sh runs pages
```

Or if you want to limit the results to a particular range, you can pass in upper and lower bounds:

```sh
sql/getBigQueryDates.sh runs pages 2015_01_01 2015_12_15
```

The output of this script is a newline-delimited list of dates. This format enables convenient piping of the output as input to the generateReports.sh script. For example:

```sh
sql/getBigQueryDates.sh runs pages | \
  xargs -I date sql/generateReports.sh -h date
```

`xargs` handles the processing of each date and calls the other script.

### Generating Specific Metrics

Running `generateReports.sh` without the `-f` flag will result in metrics whose JSON results are already on Google Storage to skip being requeried. To regenerate results for specific metrics, the easiest thing to do may be to remove its results from Google Storage first, rather than running with the `-f` flag enabled and waiting for all other metrics to be queried and uploaded.

For example, if a change is made to the `reqTotal.sql` histogram query, then you can "invalidate" all histogram results for this query by deleting all respective JSON files from Google Storage:

```sh
gsutil rm gs://httparchive/reports/*/reqTotal.json
```

The wildcard in the YYYY_MM_DD position will instruct `gsutil` to delete all histogram results for this specific metric.

Now you can delete more metric-specific results or rerun `generateReports.sh` without the `-f` flag and only the desired metrics will be requeried.

Note that the cdn.httparchive.org may still contain the old version of the JSON file for the duration of the TTL. See below for more on invalidating the cache.

## Serving the JSON Files

The Google Storage bucket is behind an App Engine load balancer and CDN, which is aliased as [cdn.httparchive.org](cdn.httparchive.org). Accessing the JSON data follows the same pattern as the `gs://` URL. For example, the public URL for `gs://httparchive/reports/2017_09_01/bytesJS.json` is [http://cdn.httparchive.org/reports/2017_09_01/bytesJS.json](http://cdn.httparchive.org/reports/2017_09_01/bytesJS.json). Each file is configured to be served with `Content-Type: application/json` and `Cache-Control: public, max-age=3600` headers.

The cache lifetime is set to 1 hour. If the cache needs to be invalidated for a particular file, this can be done by an administrator in the App Engine dashboard.

A whitelist of origins are allowed to access the CDN. This list is maintained in [config/storage-cors.json](../config/storage-cors.json) and is configured to allow local dev servers, beta.httparchive.org, and the production site. Although HTTPS is not yet configured for the beta/production sites, their respective `https://` origins are whitelisted. The CDN is also not yet configured for HTTPS. To save changes to this file, run `npm run cors` which in turn runs the appropriate `gsutil` command. See [package.json](../package.json) for more info.

## Configuring a Report

Reports are configured in [config/reports.json](../config/reports.json). Here's a small sample configuration:

```
{
  "_reports": [
    "foo",
    "bar"
  ],
  "_featured": [
    "bar"
  ],
  "_metrics": {
    "x": {
      "name": "X Metric",
      "type": "KB"
    },
    "y": {
      "name": "Y Metric",
      "type": "ms"
    },
    "z": {
      "name": "Z Metric",
      "type": "Requests"
    }
  },
  "foo": {
    "name": "Foo",
    "summary": "Lorem ipsum",
    "metrics": [
      "x",
      "y"
    ]
  },
  "bar": {
    "name": "Bar",
    "summary": "Lorem ipsum",
    "minDate": "2017_06_01",
    "maxDate": "2017_08_15",
    "metrics": [
      "x",
      "z"
    ]
  }
}
```

In this example config, there are two reports: Foo and Bar. They both include X Metric, but only Bar is featured on the home page. The Bar report is also date-capped between June 1, 2017 and August 15, 2017, meaning that the report UI will not allow the user to browse metrics outside of this time window.

### Manifest Structure

- **reports.json**

	JSON-encoded object mapping report IDs to report configs. Also includes metadata whose property names are preceded by an underscore.

  - **\_reports**

    Required array of report IDs. Defines the sequence of reports as they appear on the reports page.

  - **\_featured**

    Required array of report IDs. Defines the sequence of reports as they appear on the home page. This array should only contain 1-3 reports.

  - **\_metrics**

    Required object mapping metric IDs to metric configs.

    - **metric ID**

      Short identifier string for the metric. Used as the URL search fragment for the chart on the report page. Must be unique and match the histogram/timeseries SQL filenames. May be reused between reports.

    - **metric config**

      Maps metric configuration property names to values. The following properties are available:

      - **name**

        Required string. Human-readable name of the metric, eg "Time to First Paint". Must be unique to the report. Used in the title of the charts.

      - **type**

        Required string. Human-readable units of measurement. Common examples "ms", "KB", "Requests".. Used to label the chart axis and in chart tooltips.

      - **minDate**

        Optional string. The earliest date at which the metric is available. YYYY_MM_DD format.

      - **maxDate**

        Optional string. The latest date at which the metric is available. YYYY_MM_DD format.

  - **report ID**

  		Short identifier string for the report. Used as the URL fragment for the report page. For example, the JavaScript report with ID `js` would be accessed at `/reports/js`. Changing this value will probably break permalinks.

  - **report config**

  		Maps report configuration property names to values. The following properties are available:

  		- **name**

  			Required string. Human-readable title of the report. Must be unique.

  		- **summary**

  			Required string. Human-readable description of the report. Suggested length: 1-5 sentences.

  		- **minDate**

  			Optional string. The earliest date at which the report is available. YYYY_MM_DD format.

  		- **maxDate**

  			Optional string. The latest date at which the report is available. YYYY_MM_DD format.

  		- **metrics**

  			Required array. Describes the metrics included in the report.

## Configuring Dates

The crawl dates available to reports are maintained in [config/dates.json](../config/dates.json). This file is simply an array of `YYYY_MM_DD`-format dates, sorted in descending order. Each date corresponds to a subdirectory in the `/reports` directory on the CDN and also the dates in the timeseries.

### Syncing Dates with Google Storage

To force dates.json to reflect the dated subdirectories on Google Storage, run the [sql/syncAvailableDates.js](../sql/syncAvailableDates.js) script. This will grab the contents of the storage bucket, parse out the dates, and update the JSON file with the dates in reverse chronological order.

### Adding One Date at a Time

To add a single date at a time to dates.json, call the [sql/addDate.js](../sql/addDate.js) script with the date in `YYYY_MM_DD` format. For example:

```sh
sql/addDate.js 2017_09_01
```

This will update the contents of dates.json with the new date in sorted order.

## Rendering a Report

The [main.py](../main.py) web server config file loads dates.json and reports.json into memory on startup and refreshes their contents according to the `MAX_REPORT_STALENESS` constant, which is set to 3 hours. This helps to limit file IO on each request.

If there is only one distinct date, the server renders the report with the histogram template, otherwise it uses the timeseries template.

The report scripts will build the CDN URL based on the metric name and optional date. After fetching the JSON data, it will be massaged into a consumable format for [Highcharts](https://www.highcharts.com/) and a plain data table.

## What (Should) Happen After Each Crawl

When a crawl finishes, the following things must happen to make the new data available in the reports UI:

1. Run all of the queries with the new crawl date and save results to respective JSON files on Google Storage.

	`sql/generateReports.sh -t -h YYYY_MM_DD`

2. Add the crawl date to the list of report dates.

	`sql/addDate.js YYYY_MM_DD`

_These two commands should be set on a cron job or part of some future pubsub pipeline._

The web server will periodically update its in-memory copies of the config files and serve the latest reports.
