# Copyright 2015 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# [START app]
import json
import logging
from time import time

from flask import Flask, request, render_template, abort, url_for


class VizTypes():
    HISTOGRAM = 'histogram'
    TIMESERIES = 'timeseries'

# Ensure reports are updated every 3 hours.
MAX_REPORT_STALENESS = 60 * 60 * 3

last_report_update = 0
report_dates = []
reports_json = {}

app = Flask(__name__)

def update_reports():
    global MAX_REPORT_STALENESS
    global last_report_update

    if (time() - last_report_update) < MAX_REPORT_STALENESS:
        return

    global report_dates
    global reports_json

    with open('config/dates.json') as dates_file:
        report_dates = json.load(dates_file)

    with open('config/reports.json') as reports_file:
        reports_json = json.load(reports_file)
        last_report_update = time()
update_reports()

def get_report(report_id):
    global reports_json
    update_reports()

    report = reports_json.get(report_id).copy()
    report['id'] = report_id
    report['metrics'] = map(get_metric, report.get('metrics'))
    return report

def get_metric(metric_id):
    global reports_json
    update_reports()

    metrics = reports_json.get('_metrics')
    metric = metrics.get(metric_id)
    metric['id'] = metric_id
    return metric

def get_similar_reports(metric_id, current_report_id):
    global reports_json

    similar_reports = {}
    reports = reports_json.get('_reports', [])
    for report_id in reports:
        # A report is not similar to itself.
        if report_id == current_report_id:
            continue

        report = reports_json.get(report_id, {})
        # A report is similar if it contains the same metric.
        if 'metrics' in report and metric_id in report['metrics']:
            similar_reports[report_id] = report['name']
    return similar_reports

@app.route('/')
def index():
    global reports_json
    update_reports()

    featured_reports = map(get_report, reports_json.get('_featured'))

    return render_template('index.html', featured_reports=featured_reports)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/reports')
def reports():
    global reports_json
    update_reports()

    def map_reports(report_id):
        report = reports_json.get(report_id)
        report['id'] = report_id
        return report

    ordered_reports = map(get_report, reports_json.get('_reports'))
    return render_template('reports.html', reports=ordered_reports)

@app.route('/reports/<report_id>')
def report(report_id):
    global report_dates
    global reports_json
    update_reports()

    report = get_report(report_id)
    if not report:
        abort(404)

    dates = report_dates
    if not dates:
        abort(500)

    min_date = report.get('minDate')
    max_date = report.get('maxDate')

    # TODO: If a report doesn't explicitly have a min/max date,
    # but all of its metrics do, take the min/max of the metrics
    # and set that as the report's implicit min/max date.

    # Omit dates for which this report has no data.
    if min_date:
        dates = dates[:dates.index(min_date) + 1]
    if max_date:
        dates = dates[dates.index(max_date):]

    report['dates'] = dates

    start = request.args.get('start')
    end = request.args.get('end')

    # Canonicalize single-date formats.
    if end and not start:
        start, end = end, start

    # Canonicalize aliases.
    if start == 'latest':
        start = dates[0]
    elif start == 'earliest':
        start = dates[-1]
    if end == 'latest':
        end = dates[0]
    elif end == 'earliest':
        end = dates[-1]

    # This is longhand for the snapshot (histogram) view.
    if start == end:
        end = None
    
    # This is shorthand for the trends (timeseries) view.
    if not start and not end:
        # The default date range is 24 crawls (1 year).
        # May be shorter if the report's minimum date is more recent.
        start = dates[min(23, len(dates) - 1)]
        end = dates[0]

    if start and start not in dates:
        abort(400)
    if end and end not in dates:
        abort(400)

    viz = VizTypes.HISTOGRAM if (start and not end) else VizTypes.TIMESERIES

    # Determine which metrics should be enabled for this report.
    for metric in report['metrics']:
        # Get a list of reports that also contain this metric.
        metric['similar_reports'] = get_similar_reports(metric['id'], report_id)

        metric[viz] = metric.get(viz, {})
        enabled = metric[viz].get('enabled', True)
        min_date = metric[viz].get('minDate', start)
        max_date = metric[viz].get('maxDate', end)

        # Disabled metrics should stay that way.
        if not enabled:
            continue

        # Disable the metric if it start/end is outside of the min/max window.
        enabled = start >= min_date
        if end and enabled:
            enabled = end <= max_date

        metric[viz]['enabled'] = enabled
            

    if not request.script_root:
        request.script_root = url_for('report', report_id=report_id, _external=True)

    return render_template('report/%s.html' % viz, viz=viz, report=report, start=start, end=end)

@app.errorhandler(400)
def bad_request(e):
    return render_template('error/400.html', error=e), 400

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error/404.html', error=e), 404

@app.errorhandler(500)
def server_error(e):
    logging.exception('An error occurred during a request.')
    return render_template('error/500.html', error=e), 500

@app.errorhandler(502)
def server_error(e):
    return render_template('error/502.html', error=e), 502


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
# [END app]
