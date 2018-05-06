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
import logging
import re
from time import time
from urlparse import urlparse

from csp import csp
import reports as report_util
import faq as faq_util
from legacy import Legacy

from flask import Flask, request, make_response, render_template, redirect, abort, url_for
from flaskext.markdown import Markdown
from flask_talisman import Talisman


app = Flask(__name__)
Markdown(app)
Talisman(app,
	content_security_policy=csp,
	content_security_policy_nonce_in=['script-src'])
legacy_util = Legacy(faq_util)

@app.route('/')
def index():
	return render_template('index.html',
						   reports=report_util.get_reports(),
						   featured_reports=report_util.get_featured_reports(),
						   faq=faq_util)

@app.route('/about')
def about():
	return render_template('about.html', reports=report_util.get_reports())

@app.route('/faq')
def faq():
	return render_template('faq.html',
						   reports=report_util.get_reports(),
						   faq=faq_util)

@app.route('/reports')
def reports():
	return render_template('reports.html', reports=report_util.get_reports())

@app.route('/reports/<report_id>')
def report(report_id):
	report = report_util.get_report(report_id)
	if not report:
		abort(404)

	dates = report_util.get_dates()
	if not dates:
		abort(500)

	min_date = report.get('minDate')
	max_date = report.get('maxDate')
	date_pattern = report.get('datePattern')

	# TODO: If a report doesn't explicitly have a min/max date,
	# but all of its metrics do, take the min/max of the metrics
	# and set that as the report's implicit min/max date.

	# Omit dates for which this report has no data.
	if min_date:
		dates = dates[:dates.index(min_date) + 1]
	if max_date:
		dates = dates[dates.index(max_date):]
	if date_pattern:
		date_pattern = re.compile(date_pattern)
		dates = [d for d in dates if date_pattern.match(d)]

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
		start = dates[min(24, len(dates) - 1)]
		end = dates[0]

	if start and start not in dates:
		abort(400)
	if end and end not in dates:
		abort(400)

	viz = report_util.VizTypes.HISTOGRAM if (start and not end) else report_util.VizTypes.TIMESERIES

	if viz == report_util.VizTypes.TIMESERIES and report.get('timeseries') and not report.get('timeseries').get('enabled'):
		end = None
		viz = report_util.VizTypes.HISTOGRAM

	# Determine which metrics should be enabled for this report.
	for metric in report['metrics']:
		# Get a list of reports that also contain this metric.
		metric['similar_reports'] = report_util.get_similar_reports(metric['id'], report_id)

		# Mark the lens used for this metric, if applicable.
		metric['lens'] = request.args.get('lens')

		metric[viz] = metric.get(viz, {})
		enabled = metric[viz].get('enabled', True)
		min_date = metric[viz].get('minDate', start)
		max_date = metric[viz].get('maxDate', end)

		# Disabled metrics should stay that way.
		if not enabled:
			continue

		# Disable the metric if it start/end is outside of the min/max window.
		enabled = start >= min_date
		if max_date and enabled:
			enabled = start <= max_date
		if end and enabled:
			enabled = end <= max_date

		metric[viz]['enabled'] = enabled
			

	if not request.script_root:
		request.script_root = url_for('report', report_id=report_id, _external=True)

	return render_template('report/%s.html' % viz,
						   viz=viz,
						   reports=report_util.get_reports(),
						   report=report,
						   start=start,
						   end=end)

@app.errorhandler(400)
def bad_request(e):
	return render_template('error/400.html', error=e), 400

@app.errorhandler(404)
def page_not_found(e):
	url = urlparse(request.url)
	path = url.path
	if legacy_util.should_redirect(path):
		page = legacy_util.get_redirect_page(path)
		redirect_url = url_for(page.name, **page.kwargs)
		response = make_response(redirect(redirect_url, code=301))
		# Set a cookie that expires 5 seconds after page load, 
		# to ensure that it is only shown once per redirect.
		# Since the redirects are permanent (301) this should only be
		# shown to users the first time they hit each legacy URL.
		expiration = time() + 5
		response.set_cookie('legacy_welcome', '1', expires=expiration)
		return response

	return render_template('error/404.html', error=e, path=path), 404

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
