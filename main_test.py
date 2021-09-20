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

from main import app, talisman
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


def test_report(client):
    assert_route(client, "/reports/state-of-the-web", 200)


def test_external_report(client):
    assert_route(
        client,
        "/reports/cwv-tech",
        302,
        "https://datastudio.google.com/u/0/reporting/55bc8fad-44c2-4280-aa0b-5f3f0cd3d2be/page/M6ZPC",
    )
