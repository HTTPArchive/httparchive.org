import json
from copy import deepcopy
from time import time

import dates as date_util


class VizTypes():
    HISTOGRAM = 'histogram'
    TIMESERIES = 'timeseries'


# Ensure reports are updated every 3 hours.
MAX_REPORT_STALENESS = 60 * 60 * 3

last_report_update = 0
latest_metric_dates = {}
latest_metric_check = {}
report_dates = []
reports_json = {}


def update_reports():
    global MAX_REPORT_STALENESS
    global last_report_update

    if (time() - last_report_update) < MAX_REPORT_STALENESS:
        return

    global report_dates
    global reports_json

    report_dates = date_util.get_dates()

    with open('config/reports.json') as reports_file:
        reports_json = json.load(reports_file)
        last_report_update = time()
    update_reports()


def get_reports():
    global reports_json
    update_reports()

    return list(map(get_report, reports_json.get('_reports')))


def get_featured_reports():
    global reports_json
    update_reports()

    return map(get_report, reports_json.get('_featured'))


def map_reports(report_id):
    global reports_json
    report = reports_json.get(report_id)
    report['id'] = report_id
    return report


def get_report(report_id):
    global reports_json
    report = reports_json.get(report_id)
    if not report:
        return None
    report = deepcopy(report)
    report['id'] = report_id
    report['metrics'] = list(map(get_metric, report.get('metrics')))
    return report


def get_metric(metric_id):
    global reports_json
    metrics = reports_json.get('_metrics')
    metric = deepcopy(metrics.get(metric_id))
    if not metric:
        return None
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


def get_dates():
    global report_dates
    return report_dates


def get_latest_date(metric_id):
    global report_dates
    global latest_metric_dates
    global latest_metric_check
    global MAX_REPORT_STALENESS

    # Check the cache before hitting GCS.
    latest_date = latest_metric_dates.get(metric_id)
    if latest_date:
        # Only return the cached value if it's the latest date
        # So reports like CrUX which come in later are checked each time
        if latest_date == report_dates[0]:
            return latest_date
        # If it's not the latest date, but we're within our staleness time period
        # then also OK to use this
        if (time() - latest_metric_check[metric_id]) < MAX_REPORT_STALENESS:
            return latest_date

    # If not using cached value then get the latest value
    latest_date = date_util.get_latest_date(report_dates, metric_id)
    latest_metric_dates[metric_id] = latest_date
    latest_metric_check[metric_id] = time()
    return latest_date


def get_lenses():
    global reports_json
    # TODO: Consider sorting the lenses by name.
    return reports_json.get('_lens', {})


def get_lens(lens_id):
    lenses = get_lenses()
    lens = deepcopy(lenses.get(lens_id))
    if not lens:
        return None
    lens['id'] = lens_id
    return lens


def is_valid_lens(lens):
    lenses = get_lenses()
    return lens in lenses


update_reports()
