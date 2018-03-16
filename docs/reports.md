# Reports

A _report_ is a collection of similar metrics. Reports may span multiple crawls, in which case the data is visualized as a timeseries. Reports may also focus on one snapshot of a particular crawl, in which case the data is visualized as a histogram.

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
      "type": "Requests",
      "redundant": true
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

        Required string. Human-readable units of measurement. Common examples: "ms", "KB", "Requests". Used to label the chart axis and in chart tooltips.

      - **description**

        Optional string. Human-readable explanation of what the metric is measuring and how to interpret the results.

      - **downIsBad**

        Optional boolean. Indicates that the metric going down is a bad thing. Defaults to false. For example all timing metrics should be as low (fast) as possible. Other metrics, like percent of HTTPS adoption, should be increasing, so this config should be set to `true`.

      - **downIsNeutral**

        Optional boolean. Indicates that the metric going down is not necessarily either good nor bad. Defaults to false.

      - **histogram**

        Optional object. Includes histogram-specific configuration options.

        - **minDate**

          Optional string. The earliest date at which the metric is available. YYYY_MM_DD format. For example, any metric that depends on the `har` dataset must have a `minDate` value of at least 2016_01_01, which is when the first HAR table became available.

        - **maxDate**

          Optional string. The latest date at which the metric is available. YYYY_MM_DD format.

        - **enabled**

          Optional boolean. Default `true`. Whether the metric should be included in histogram reports.

      - **timeseries**

        Optional object. Includes timeseries-specific configuration options.

        - **enabled**

          Optional boolean. Default `true`. Whether the metric should be included in timeseres reports.

        - **fields**

          Optional array. Default `["p10", "p25", "p50", "p75", "p90"]`. Defines the field names of the measurement objects that should be plotted. A measurement object is just an element in the array of JSON-encoded timeseries data, containing client, date, and timestamp info as well as the measurement data.

        - **redundant**

          Optional boolean. Default `false`. Whether the metric type is redundant with the metric name. For example, set to `true` when the type is included in the name, like "Total Requests". The type will be omitted anywhere it follows the metric name.

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

      - **datePattern**

        Optional string. Regular expression pattern of dates for which the report is available. For example, `".*_01$"` matches only the first crawl of the month.

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
