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

from server import app, talisman
import pytest


# Create test client without https redirect
# (normally taken care of by running in debug)
@pytest.fixture
def client():
    with app.test_client() as client:
        talisman.force_https = False
        yield client


# Add a function to test routes with optional location
def assert_route(client, path, status, location=None):
    response = client.get(path)
    redirect_loc = response.location
    if redirect_loc:
        redirect_loc = redirect_loc.replace("http://localhost", "")
    if location is not None:
        assert response.status_code == status and redirect_loc == location
    else:
        assert response.status_code == status


def test_index(client):
    assert_route(client, "/", 200)


def test_reports(client):
    assert_route(client, "/reports", 200)


def test_reports_with_slash(client):
    assert_route(client, "/reports/", 301, "/reports")


def test_report_state_of_the_web(client):
    assert_route(client, "/reports/state-of-the-web", 200)


def test_report_state_of_the_web_with_slash(client):
    assert_route(client, "/reports/state-of-the-web/", 301, "/reports/state-of-the-web")


def test_reports_www(client):
    assert_route(
        client,
        "https://www.httparchive.org/reports",
        301,
        "https://httparchive.org/reports",
    )


def test_reports_beta(client):
    assert_route(
        client,
        "https://beta.httparchive.org/reports",
        301,
        "https://httparchive.org/reports",
    )


def test_reports_legacy(client):
    assert_route(
        client,
        "https://legacy.httparchive.org/reports",
        301,
        "https://httparchive.org/reports",
    )


def test_report_state_of_the_web_lens(client):
    response = client.get("/reports/state-of-the-web?lens=top1k")
    assert (
        response.status_code == 200
        and '<option value="top1k" selected>' in response.get_data(as_text=True)
    )


def test_reports_json(client):
    response = client.get("/reports?f=json")
    assert response.status_code == 200 and "application/json" in response.headers.get(
        "Content-Type"
    )


def test_report_state_of_the_web_json(client):
    response = client.get("/reports/state-of-the-web?f=json")
    assert response.status_code == 200 and "application/json" in response.headers.get(
        "Content-Type"
    )


def test_invalid_report(client):
    assert_route(client, "/reports/test", 404)


def test_report_invalid_start_date(client):
    assert_route(
        client, "/reports/state-of-the-web?start=1900_05_15&end=latest&view=list", 400
    )


def test_report_invalid_end_date(client):
    assert_route(
        client, "/reports/state-of-the-web?start=earliest&end=1900_05_15&view=list", 400
    )


def test_report_crux_max_date(client):
    assert_route(client, "/reports/chrome-ux-report", 200)


def test_report_latest(client):
    assert_route(client, "/reports/state-of-the-web?end=latest&view=list", 200)


def test_report_earliest(client):
    assert_route(client, "/reports/state-of-the-web?start=earliest&view=list", 200)


def test_report_earliest_end(client):
    assert_route(
        client, "/reports/state-of-the-web?start=earliest&end=earliest&view=list", 200
    )


def test_about(client):
    assert_route(client, "/about", 200)


def test_about_with_slash(client):
    assert_route(client, "/about/", 301, "/about")


def test_faq(client):
    assert_route(client, "/faq", 200)


def test_faq_with_slash(client):
    assert_route(client, "/faq/", 301, "/faq")


def test_legacy_page(client):
    assert_route(client, "/index.php", 301, "/")


def test_robots_txt(client):
    response = client.get("/robots.txt")
    assert response.status_code == 200 and "text/plain" in response.headers.get(
        "Content-Type"
    )


def test_sitemap(client):
    response = client.get("/sitemap.xml")
    assert response.status_code == 200 and "text/xml" in response.headers.get(
        "Content-Type"
    )


def test_favicon(client):
    response = client.get("/favicon.ico")
    # Note flask sometimes returns image/x-icon and sometimes image/vnd.microsoft.icon
    assert response.status_code == 200 and "image/" in response.headers.get(
        "Content-Type"
    )


def test_metric(client):
    response = client.get("/metric.json")
    assert response.status_code == 200 and "id parameter required" in response.get_data(
        as_text=True
    )


def test_metric_speedindex(client):
    response = client.get("/metric.json?id=speedIndex")
    assert (
        response.status_code == 200
        and '"description":"How quickly the contents of a page'
        in response.get_data(as_text=True)
    )


def test_external_report(client):
    assert_route(
        client,
        "/reports/cwv-tech",
        302,
        "https://datastudio.google.com/u/0/reporting/55bc8fad-44c2-4280-aa0b-5f3f0cd3d2be/page/M6ZPC",
    )


def test_render_efonts_cache_control(client):
    response = client.get("/static/fonts/opensans-latin-700.woff2")
    assert response.status_code == 200 and "max-age=3153600" in response.headers.get(
        "Cache-Control"
    )


def test_render_js_cache_control(client):
    response = client.get("/static/js/main.js")
    assert response.status_code == 200 and "max-age=10800" in response.headers.get(
        "Cache-Control"
    )


def test_tech_report_compare(client):
    response = client.get(
        "/reports/techreport/tech?tech=jQuery%2CWordPress&geo=ALL&rank=ALL"
    )
    assert response.status_code == 200


def test_tech_report_drilldown(client):
    response = client.get("/reports/techreport/tech?geo=ALL&rank=ALL")
    assert response.status_code == 200


def test_tech_report_drilldown_wordpress(client):
    response = client.get("/reports/techreport/tech?tech=WordPress&geo=ALL&rank=ALL")
    assert response.status_code == 200


def test_tech_report_category(client):
    response = client.get("/reports/techreport/category?geo=ALL&rank=ALL&category=CMS")
    assert response.status_code == 200


def test_well_known_atproto_did(client):
    response = client.get("/.well-known/atproto-did")
    assert response.status_code == 200
