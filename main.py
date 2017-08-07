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

from flask import Flask, request, render_template, abort


app = Flask(__name__)

class VizTypes():
    HISTOGRAM = 'histogram'
    TIMESERIES = 'timeseries'

with open('config/reports.json') as reports_file:
    reports_json = json.load(reports_file)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/reports')
def reports():
    return render_template('reports.html', reports=reports_json)

@app.route('/reports/<report_id>')
def report(report_id):
    report = reports_json.get(report_id)
    
    if not report:
        abort(404)

    date = request.args.get('date')

    if date and date not in report.get('dates'):
        abort(404)

    viz = VizTypes.HISTOGRAM if date else VizTypes.TIMESERIES

    return render_template('report/%s.html' % viz, report=report, date=date)


@app.errorhandler(500)
def server_error(e):
    logging.exception('An error occurred during a request.')
    return """
    An internal error occurred: <pre>{}</pre>
    See logs for full stacktrace.
    """.format(e), 500


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
# [END app]
