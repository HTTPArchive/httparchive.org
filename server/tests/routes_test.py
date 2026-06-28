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

import pytest
from server import app, talisman


@pytest.fixture
def client():
    with app.test_client() as client:
        talisman.force_https = False
        yield client


def assert_route(client, path, status, location=None):
    response = client.get(path)
    redirect_loc = response.location
    if redirect_loc:
        redirect_loc = redirect_loc.replace("http://localhost", "")
    if location is not None:
        assert response.status_code == status and redirect_loc == location
    else:
        assert response.status_code == status


def test_index_is_404_on_flask(client):
    # Under Astro SSG, page routes are served statically by GAE, so Flask returns 404
    assert_route(client, "/", 404)


def test_reports_is_404_on_flask(client):
    assert_route(client, "/reports", 404)


def test_about_is_404_on_flask(client):
    assert_route(client, "/about", 404)


def test_faq_is_404_on_flask(client):
    assert_route(client, "/faq", 404)


def test_legacy_php_redirect(client):
    assert_route(client, "/index.php", 301, "/")


def test_robots_txt(client):
    response = client.get("/robots.txt")
    assert response.status_code == 200 and "text/plain" in response.headers.get("Content-Type")


def test_favicon(client):
    response = client.get("/favicon.ico")
    assert response.status_code == 200 and "image/" in response.headers.get("Content-Type")


def test_metric_api_requires_id(client):
    response = client.get("/metric.json")
    assert response.status_code == 200 and "id parameter required" in response.get_data(as_text=True)


def test_metric_api_speedindex(client):
    response = client.get("/metric.json?id=speedIndex")
    assert (
        response.status_code == 200
        and '"description":"How quickly the contents of a page' in response.get_data(as_text=True)
    )


def test_api_dates(client):
    response = client.get("/api/dates.json")
    assert response.status_code == 200 and "application/json" in response.headers.get("Content-Type")
    data = response.get_json()
    assert "dates" in data
    assert isinstance(data["dates"], list)
    assert len(data["dates"]) > 0


def test_well_known_atproto_did(client):
    response = client.get("/.well-known/atproto-did")
    assert response.status_code == 200
