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
import os
import logging
from flask import (
    Flask,
    request,
    render_template as flask_render_template,
    redirect,
    url_for as flask_url_for,
)
from werkzeug.http import HTTP_STATUS_CODES
from flask_talisman import Talisman
from urllib.parse import urlparse, urlunparse
from .markdown import Markdown, markdown
from whitenoise import WhiteNoise


from .csp import csp
from . import reports as report_util
from . import faq as faq_util
from . import timestamps as timestamps_util
from .legacy import Legacy


logging.basicConfig(level=logging.DEBUG)
logging.getLogger("MARKDOWN").setLevel(logging.INFO)

ROOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TEMPLATES_DIR = ROOT_DIR + "/templates"
STATIC_DIR = ROOT_DIR + "/static"


# WOFF/WOFF2 fonts are fingerprinted and never change — cache for 1 year.
# get_send_file_max_age is still used by Flask's test client;
# whitenoise_add_headers applies the same rule when WhiteNoise serves the files.
class HttpArchiveWebServer(Flask):
    def get_send_file_max_age(self, name):
        if name:
            if name.lower().endswith(".woff") or name.lower().endswith(".woff2"):
                return 31536000  # pragma: no cover
        return Flask.get_send_file_max_age(self, name)


def whitenoise_add_headers(headers, path, url):
    """Override Cache-Control for static asset types that need non-default TTLs."""
    if path.lower().endswith(".woff") or path.lower().endswith(".woff2"):
        headers["Cache-Control"] = "max-age=31536000, public"


# Initialize The Server
app = HttpArchiveWebServer(
    __name__, template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR
)

# Wrap WSGI app with WhiteNoise for serving static files efficiently on Cloud Run.
# max_age=10800 (3h) matches the old app.yaml default_expiration.
# Font files get a 1-year TTL via whitenoise_add_headers.
app.wsgi_app = WhiteNoise(
    app.wsgi_app,
    root=STATIC_DIR,
    prefix="static/",
    max_age=10800,
    add_headers_function=whitenoise_add_headers,
)

# register jinja2 extensions and filters

app.jinja_options = app.jinja_options.copy()
app.jinja_env.add_extension(Markdown)
app.jinja_env.filters["markdown"] = markdown

# Disable HTTPS redirect locally when FLASK_DEBUG=1 (mirrors the old
# 'python main.py background' which set talisman.force_https = False).
_force_https = not bool(os.environ.get("FLASK_DEBUG"))
talisman = Talisman(
    app,
    content_security_policy=csp,
    content_security_policy_nonce_in=["script-src"],
    force_https=_force_https,
)
legacy_util = Legacy(faq_util)


@app.before_request
def redirect_www():
    """Redirect subdomain requests to bare domain."""
    urlparts = urlparse(request.url)
    if (
        urlparts.netloc == "www.httparchive.org"
        or urlparts.netloc == "beta.httparchive.org"
        or urlparts.netloc == "legacy.httparchive.org"
    ):
        urlparts_list = list(urlparts)
        urlparts_list[1] = "httparchive.org"
        return redirect(urlunparse(urlparts_list), code=301)
    return None


@app.after_request
def add_header(response):
    # Make sure bad responses are not cached
    #
    # Cache good responses for 10 mins if no other Cache-Control header set
    # This is used for the dynamically generated files (e.g. the HTML)
    # (currently don't use unique filenames so cannot use long caches and
    # some say they are overrated anyway as caches smaller than we think).
    # Note this IS used by Google App Engine as dynamic content.
    if "Cache-Control" not in response.headers:
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
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 10800


# Overwrite the built-in method.
def render_template(template, *args, **kwargs):

    date_published = timestamps_util.get_file_date_info(template, "date_published")
    date_modified = timestamps_util.get_file_date_info(template, "date_modified")

    kwargs.update(date_published=date_published, date_modified=date_modified)
    return flask_render_template(template, *args, **kwargs)


# Overwrite the built-in method.
def url_for(endpoint, **kwargs):
    # Persist the lens parameter across navigations.
    lens = request.args.get("lens")
    if report_util.is_valid_lens(lens):
        kwargs["lens"] = lens

    # Pass through to the built-in method.
    return flask_url_for(endpoint, **kwargs)


app.jinja_env.globals["url_for"] = url_for
app.jinja_env.globals["get_versioned_filename"] = timestamps_util.get_versioned_filename
app.jinja_env.globals["HTTP_STATUS_CODES"] = HTTP_STATUS_CODES


# Circular Import but this is fine because routes and errors modules are not used in here and
# this way we make app available for decorators in both modules
# For more details, check https://flask.palletsprojects.com/en/1.1.x/patterns/packages/
import server.routes
import server.errors

# [END app]
