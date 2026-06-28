"""
Slim Flask server for httparchive.org.

After the Astro SSG migration, Flask only serves:
  - /metric.json         — live GCS: latest date for a given metric
  - /api/dates.json      — live GCS: list all available crawl dates
  - /robots.txt, /favicon.ico, /.well-known/* — static file pass-through
  - Legacy .php redirects and 404 handling (via errors.py)

All HTML pages are served as static files built by Astro.
"""
from flask import abort, jsonify, request, send_from_directory

from . import app
from . import reports as report_util
from .dates import get_dates


# ---------------------------------------------------------------------------
# GCS-dependent JSON endpoints
# ---------------------------------------------------------------------------

@app.route("/metric.json")
def metric():
    """Return metadata and latest date for a given metric from GCS."""
    metric_id = request.args.get("id")
    if not metric_id:
        abort(jsonify(status=400, message="id parameter required"))

    metric = report_util.get_metric(metric_id)
    # A metric has a histogram if it is not explicitly disabled.
    has_histogram = metric and metric.get("histogram", {}).get("enabled", True)
    latest = (
        report_util.get_latest_date(metric_id) if metric and has_histogram else None
    )

    return jsonify(status=200, metric=metric, latest=latest)


@app.route("/api/dates.json")
def api_dates():
    """Return all available crawl dates from GCS for client-side date filtering."""
    dates = get_dates()
    return jsonify(status=200, dates=dates)


# ---------------------------------------------------------------------------
# Static file pass-through helpers
# ---------------------------------------------------------------------------

@app.route("/robots.txt")
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])


@app.route("/favicon.ico")
def default_favicon():
    return send_from_directory(app.static_folder, "img/favicon.ico")


@app.route("/.well-known/<file>")
def wellknown(file):
    return send_from_directory(app.static_folder, ("well-known/%s" % file))


def get_format(request):
    return request.args.get("f")
