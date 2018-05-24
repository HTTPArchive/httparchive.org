import json
import logging
from copy import deepcopy
from time import time

import dates as dateutil


class VizTypes():
	HISTOGRAM = 'histogram'
	TIMESERIES = 'timeseries'

# Ensure reports are updated every 3 hours.
MAX_REPORT_STALENESS = 60 * 60 * 3

last_report_update = 0
report_dates = []
reports_json = {}

def update_reports():
	global MAX_REPORT_STALENESS
	global last_report_update

	if (time() - last_report_update) < MAX_REPORT_STALENESS:
		return

	global report_dates
	global reports_json

	report_dates = dateutil.get_dates()

	with open('config/reports.json') as reports_file:
		reports_json = json.load(reports_file)
		last_report_update = time()
update_reports()

def get_reports():
	global reports_json
	update_reports()

	return map(get_report, reports_json.get('_reports'))

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
	report['metrics'] = map(get_metric, report.get('metrics'))
	return report

def get_metric(metric_id):
	global reports_json
	metrics = reports_json.get('_metrics')
	metric = deepcopy(metrics.get(metric_id))
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

def get_lenses():
	global reports_json
	return reports_json.get('_lens', {})

def get_lens(lens):
	lenses = get_lenses()
	return lenses.get(lens, {})

def is_valid_lens(lens):
	lenses = get_lenses()
	return lens in lenses
