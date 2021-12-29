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
import sys
import logging
import re
from time import time
try:
    from urllib.parse import urlparse, urlunparse
except ImportError:
    from urlparse import urlparse, urlunparse

from csp import csp
import reports as report_util
import faq as faq_util
import timestamps as timestamps_util
from legacy import Legacy

from flask import Flask, request, make_response, jsonify, render_template as flask_render_template, \
                  redirect, abort, url_for as flask_url_for, send_from_directory
from flaskext.markdown import Markdown
from flask_talisman import Talisman


logging.basicConfig(level=logging.DEBUG)


# Set WOFF and WOFF2 caching to return 1 year as they should never change
# Note this requires similar set up in app.yaml for Google App Engine
class HttpArchiveWebServer(Flask):
    def get_send_file_max_age(self, name):
        if name:
            if name.lower().endswith('.woff') or name.lower().endswith('.woff2'):
                return 31536000
        return Flask.get_send_file_max_age(self, name)


# Initialize The Server
app = HttpArchiveWebServer(__name__)
Markdown(app)
talisman = Talisman(app,
                    content_security_policy=csp,
                    content_security_policy_nonce_in=['script-src'])
legacy_util = Legacy(faq_util)


@app.before_request
def redirect_www():
    """Redirect www requests to bare domain."""
    urlparts = urlparse(request.url)
    if urlparts.netloc == 'www.httparchive.org':
        urlparts_list = list(urlparts)
        urlparts_list[1] = 'httparchive.org'
        return redirect(urlunparse(urlparts_list), code=301)


@app.after_request
def add_header(response):
    # Make sure bad responses are not cached
    #
    # Cache good responses for 10 mins if no other Cache-Control header set
    # This is used for the dynamically generated files (e.g. the HTML)
    # (currently don't use unique filenames so cannot use long caches and
    # some say they are overrated anyway as caches smaller than we think).
    # Note this IS used by Google App Engine as dynamic content.
    if 'Cache-Control' not in response.headers:
        if response.status_code != 200 and response.status_code != 304:
            response.cache_control.no_store = True
            response.cache_control.no_cache = True
            response.cache_control.max_age = 0
        if response.status_code == 200 or response.status_code == 304:
            response.cache_control.public = True
            response.cache_control.max_age = 600
    return response


# Cache static resources for 10800 secs (3 hrs) with SEND_FILE_MAX_AGE_DEFAULT.
# Flask default if not set is 12 hours but we want to match app.yaml
# which is used by Google App Engine as it serves static files directly
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 10800


# Overwrite the built-in method.
def render_template(template, *args, **kwargs):

    date_published = timestamps_util.get_file_date_info(template, "date_published")
    date_modified = timestamps_util.get_file_date_info(template, "date_modified")

    kwargs.update(date_published=date_published,
                  date_modified=date_modified)
    return flask_render_template(template, *args, **kwargs)


# Overwrite the built-in method.
def url_for(endpoint, **kwargs):
    # Persist the lens parameter across navigations.
    lens = request.args.get('lens')
    if report_util.is_valid_lens(lens):
        kwargs['lens'] = lens

    # Pass through to the built-in method.
    return flask_url_for(endpoint, **kwargs)


app.jinja_env.globals['url_for'] = url_for
app.jinja_env.globals['get_versioned_filename'] = timestamps_util.get_versioned_filename


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


# A public JSON endpoint to get info about a given metric.
@app.route('/metric.json')
def metric():
    metric_id = request.args.get('id')
    if not metric_id:
        abort(jsonify(status=400, message='id parameter required'))

    metric = report_util.get_metric(metric_id)
    # A metric has a histogram if it is not explicitly disabled.
    has_histogram = metric and metric.get('histogram', {}).get('enabled', True)
    latest = report_util.get_latest_date(metric_id) if metric and has_histogram else None

    return jsonify(
        status=200,
        metric=metric,
        latest=latest
    )


@app.route('/reports')
def reports():
    all_reports = report_util.get_reports()

    # Return as JSON if requested.
    if get_format(request) == 'json':
        return jsonify(status=200, reports=all_reports)

    return render_template('reports.html', reports=all_reports)


@app.route('/reports/<report_id>')
def report(report_id):
    report = report_util.get_report(report_id)
    if not report:
        abort(404)

    report_url = report_util.get_report(report_id).get('url')
    if report_url:
        return redirect(report_url), 302

    dates = report_util.get_dates()
    if not dates:
        abort(500)

    min_date = report.get('minDate')
    max_date = report.get('maxDate')
    date_pattern = report.get('datePattern')
    max_date_metric = report.get('maxDateMetric')

    # TODO: If a report doesn't explicitly have a min/max date,
    # but all of its metrics do, take the min/max of the metrics
    # and set that as the report's implicit min/max date.

    # Omit dates for which this report has no data.
    if max_date_metric:
        max_date = report_util.get_latest_date(max_date_metric)
    if min_date:
        dates = dates[:dates.index(min_date) + 1]
    if max_date:
        dates = dates[dates.index(max_date):]
    if date_pattern:
        date_pattern = re.compile(date_pattern)
        dates = [d for d in dates if date_pattern.match(d)]

    report['dates'] = dates
    report['lenses'] = report_util.get_lenses()

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
        # The default date range is 72 crawls (3 years).
        # May be shorter if the report's minimum date is more recent.
        start = dates[min(72, len(dates) - 1)]
        end = dates[0]

    if start and start not in dates:
        abort(400)
    if end and end not in dates:
        abort(400)

    viz = report_util.VizTypes.HISTOGRAM if (start and not end) else report_util.VizTypes.TIMESERIES

    if viz == report_util.VizTypes.TIMESERIES and report.get('timeseries') \
       and not report.get('timeseries').get('enabled'):
        end = None
        viz = report_util.VizTypes.HISTOGRAM

        # The default for histograms should be the latest date.
        if not request.args.get('start'):
            start = dates[0]

    lens_id = get_lens_id(request)
    lens = report_util.get_lens(lens_id)
    if lens:
        report['lens'] = lens

    report['view'] = get_report_view(report, request)

    # Determine which metrics should be enabled for this report.
    for metric in report['metrics']:
        # Get a list of reports that also contain this metric.
        metric['similar_reports'] = report_util.get_similar_reports(metric['id'], report_id)

        # Mark the lens used for this metric, if applicable.
        if lens:
            metric['lens'] = lens

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

    script_root = url_for('report', report_id=report_id, _external=True)

    # Return as JSON if requested.
    if get_format(request) == 'json':
        return jsonify(status=200, report=report, start=start, end=end, viz=viz)

    return render_template('report/%s.html' % viz,
                           viz=viz,
                           script_root=script_root,
                           reports=report_util.get_reports(),
                           report=report,
                           start=start,
                           end=end)


def get_lens_id(request):
    host = request.host.split('.')
    subdomain = len(host) > 2 and host[0] or ''
    return request.args.get('lens') or subdomain


def get_report_view(report, request):
    view = request.args.get('view')
    return view if view in ('list', 'grid') else report.get('view', 'list')


def get_format(request):
    return request.args.get('f')


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
def server_error_500(e):
    logging.exception('An error occurred during a request.')
    return render_template('error/500.html', error=e), 500


@app.errorhandler(502)
def server_error_502(e):
    return render_template('error/502.html', error=e), 502


@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])


@app.route('/favicon.ico')
def default_favicon():
    return send_from_directory(app.static_folder, 'img/favicon.ico')


@app.route('/sitemap.xml')
# Chrome and Safari use inline styles to display XMLs files.
# https://bugs.chromium.org/p/chromium/issues/detail?id=924962
# Override default CSP (including turning off nonce) to allow sitemap to display
@talisman(
    content_security_policy={'default-src': ['\'self\''], 'script-src': ['\'self\''],
                             'style-src': ['\'unsafe-inline\''], 'img-src': ['\'self\'', 'data:']},
    content_security_policy_nonce_in=['script-src']
)
def sitemap():
    xml = render_template('sitemap.xml')
    resp = app.make_response(xml)
    resp.mimetype = "text/xml"
    return resp


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.

    # If the 'background' command line argument is given:
    #    python main.py background &
    # then run in non-debug mode, as debug mode can't be backgrounded
    # but debug mode is useful in general (as auto reloads on change)
    if len(sys.argv) > 1 and sys.argv[1] == 'background':
        logging.debug('Running in background mode')
        # Turn off HTTPS redirects (automatically turned off for debug)
        talisman.force_https = False
        app.run(host='0.0.0.0', port=8080)
    else:
        logging.debug('Running in debug mode')
        app.run(host='0.0.0.0', port=8080, debug=True)

# [END app]
