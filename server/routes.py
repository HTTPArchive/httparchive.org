from flask import redirect, request, jsonify, abort, send_from_directory
import re


from . import app, talisman, render_template, url_for
from . import reports as report_util
from . import techreport as tech_report_util
from . import faq as faq_util


def safe_int(value, default=1):
    """
    Safely convert a value to integer, default to 1 if conversion fails.
    """
    try:
        return int(value) if value else default
    except (ValueError, TypeError):
        return default


@app.route("/")
def index():
    return render_template(
        "index.html",
        reports=report_util.get_reports(),
        featured_reports=report_util.get_featured_reports(),
        faq=faq_util,
    )


@app.route("/about", strict_slashes=False)
def about():

    if request.base_url[-1] == "/":
        return redirect("/about"), 301

    return render_template("about.html", reports=report_util.get_reports())


@app.route("/faq", strict_slashes=False)
def faq():

    if request.base_url[-1] == "/":
        return redirect("/faq"), 301
    return render_template("faq.html", reports=report_util.get_reports(), faq=faq_util)


# A public JSON endpoint to get info about a given metric.
@app.route("/metric.json")
def metric():
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


@app.route("/reports", strict_slashes=False)
def reports():

    if request.base_url[-1] == "/":
        return redirect("/reports"), 301

    all_reports = report_util.get_reports()

    # Return as JSON if requested.
    if get_format(request) == "json":
        return jsonify(status=200, reports=all_reports)

    return render_template("reports.html", reports=all_reports)


@app.route("/reports/techreport/<page_id>", strict_slashes=False)
def techreportlanding(page_id):
    # Needed for the header dropdown
    all_reports = report_util.get_reports()

    # Get the configuration for the tech report
    tech_report = tech_report_util.get_report()

    # Get the settings for the current page
    active_tech_report = tech_report.get("pages").get(page_id)

    # Add the technologies requested in the URL to the filters
    # Use the default configured techs as fallback
    # Use ["ALL"] if there is nothing configured
    requested_technologies = active_tech_report.get("config").get("default").get(
        "app"
    ) or ["ALL"]

    # Get the filters
    requested_geo = request.args.get("geo") or "ALL"
    requested_rank = request.args.get("rank") or "ALL"
    requested_category = request.args.get("category") or "CMS"
    requested_page = safe_int(request.args.get("page"))  # TODO: After security scanner is off, return 400 if not an int
    selected_techs = request.args.get("selected")
    selected_rows = str(safe_int(request.args.get("rows"), default=10))

    last_page = request.args.get("last_page") or False

    filters = {
        "geo": requested_geo,
        "rank": requested_rank,
        "app": requested_technologies,
        "category": requested_category,
        "page": requested_page,
        "last_page": last_page,
        "selected": selected_techs,
        "rows": selected_rows,
    }
    params = {
        "geo": requested_geo.replace(" ", "+"),
        "rank": requested_rank.replace(" ", "+"),
    }

    active_tech_report["filters"] = filters
    active_tech_report["params"] = params

    return render_template(
        "techreport/%s.html" % page_id,
        active_page=page_id,
        tech_report_labels=tech_report.get("labels"),
        tech_report_config=tech_report.get("config"),
        tech_report_page=active_tech_report,
        custom_navigation=True,
        reports=all_reports,
    )


@app.route("/reports/techreport/tech", strict_slashes=False)
def techreport():
    # Needed for the header dropdown
    all_reports = report_util.get_reports()

    # Get the configuration for the tech report
    tech_report = tech_report_util.get_report()

    # Get the current page_id
    requested_technologies = ["ALL"]
    if request.args.get("tech"):
        requested_technologies = request.args.get("tech").split(",")

    if len(requested_technologies) > 1:
        page_id = "comparison"
    else:
        page_id = "drilldown"

    # Get the settings for the current page
    active_tech_report = tech_report.get("pages").get(page_id)

    # Add the technologies requested in the URL to the filters
    # Use the default configured techs as fallback
    # Use ["ALL"] if there is nothing configured
    requested_technologies = active_tech_report.get("config").get("default").get(
        "app"
    ) or ["ALL"]

    if request.args.get("tech"):
        requested_technologies = request.args.get("tech").split(",")

    # Get the filters
    requested_geo = request.args.get("geo") or "ALL"
    requested_rank = request.args.get("rank") or "ALL"
    requested_category = request.args.get("category") or "ALL"
    filters = {
        "geo": requested_geo,
        "rank": requested_rank,
        "app": requested_technologies,
        "category": requested_category,
    }
    params = {
        "geo": requested_geo.replace(" ", "+"),
        "rank": requested_rank.replace(" ", "+"),
    }

    active_tech_report["filters"] = filters
    active_tech_report["params"] = params

    return render_template(
        "techreport/%s.html" % page_id,
        active_page=page_id,
        requested_page="technology",
        tech_report_labels=tech_report.get("labels"),
        tech_report_config=tech_report.get("config"),
        tech_report_page=active_tech_report,
        custom_navigation=True,
        reports=all_reports,
    )


@app.route("/reports/<report_id>", strict_slashes=False)
def report(report_id):

    if request.base_url[-1] == "/":
        return redirect("/reports/%s" % (report_id)), 301

    report = report_util.get_report(report_id)
    if not report:
        abort(404)

    report_url = report_util.get_report(report_id).get("url")
    if report_url:
        return redirect(report_url), 302

    dates = report_util.get_dates()
    if not dates:  # pragma: no cover
        abort(500)

    min_date = report.get("minDate")
    max_date = report.get("maxDate")
    date_pattern = report.get("datePattern")
    max_date_metric = report.get("maxDateMetric")

    # TODO: If a report doesn't explicitly have a min/max date,
    # but all of its metrics do, take the min/max of the metrics
    # and set that as the report's implicit min/max date.

    # Omit dates for which this report has no data.
    if max_date_metric:
        max_date = report_util.get_latest_date(max_date_metric)
    if min_date:
        dates = dates[: dates.index(min_date) + 1]
    if max_date:
        dates = dates[dates.index(max_date) :]  # noqa: E203
    if date_pattern:
        date_pattern = re.compile(date_pattern)
        dates = [d for d in dates if date_pattern.match(d)]

    report["dates"] = dates
    report["lenses"] = report_util.get_lenses()

    start = request.args.get("start")
    end = request.args.get("end")

    # Canonicalize single-date formats.
    if end and not start:
        start, end = end, start

    # Canonicalize aliases.
    if start == "latest":
        start = dates[0]
    elif start == "earliest":
        start = dates[-1]
    if end == "latest":
        end = dates[0]
    elif end == "earliest":
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

    viz = (
        report_util.VizTypes.HISTOGRAM
        if (start and not end)
        else report_util.VizTypes.TIMESERIES
    )

    if (
        viz == report_util.VizTypes.TIMESERIES
        and report.get("timeseries")
        and not report.get("timeseries").get("enabled")
    ):  # pragma: no cover
        end = None
        viz = report_util.VizTypes.HISTOGRAM

        # The default for histograms should be the latest date.
        if not request.args.get("start"):
            start = dates[0]

    lens_id = get_lens_id(request)
    lens = report_util.get_lens(lens_id)
    if lens:
        report["lens"] = lens

    report["view"] = get_report_view(report, request)

    # Determine which metrics should be enabled for this report.
    for metric in report["metrics"]:
        # Get a list of reports that also contain this metric.
        metric["similar_reports"] = report_util.get_similar_reports(
            metric["id"], report_id
        )

        # Mark the lens used for this metric, if applicable.
        if lens:
            metric["lens"] = lens

        metric[viz] = metric.get(viz, {})
        enabled = metric[viz].get("enabled", True)
        min_date = metric[viz].get("minDate", start)
        max_date = metric[viz].get("maxDate", end)

        # Disabled metrics should stay that way.
        if not enabled:
            continue

        # Disable the metric if it start/end is outside of the min/max window.
        enabled = start >= min_date
        if max_date and enabled:
            enabled = start <= max_date
        if end and enabled:
            enabled = end <= max_date

        metric[viz]["enabled"] = enabled

    script_root = url_for("report", report_id=report_id, _external=True)

    # Return as JSON if requested.
    if get_format(request) == "json":
        return jsonify(status=200, report=report, start=start, end=end, viz=viz)

    return render_template(
        "report/%s.html" % viz,
        viz=viz,
        script_root=script_root,
        reports=report_util.get_reports(),
        report=report,
        start=start,
        end=end,
    )


def get_lens_id(request):
    host = request.host.split(".")
    subdomain = len(host) > 2 and host[0] or ""
    return request.args.get("lens") or subdomain


def get_report_view(report, request):
    view = request.args.get("view")
    return view if view in ("list", "grid") else report.get("view", "list")


def get_format(request):
    return request.args.get("f")


@app.route("/robots.txt")
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])


@app.route("/favicon.ico")
def default_favicon():
    return send_from_directory(app.static_folder, "img/favicon.ico")


@app.route("/sitemap.xml")
# Chrome and Safari use inline styles to display XMLs files.
# https://bugs.chromium.org/p/chromium/issues/detail?id=924962
# Override default CSP (including turning off nonce) to allow sitemap to display
@talisman(
    content_security_policy={
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
    },
    content_security_policy_nonce_in=["script-src"],
)
def sitemap():
    xml = render_template("sitemap.xml")
    resp = app.make_response(xml)
    resp.mimetype = "text/xml"
    return resp


@app.route("/.well-known/<file>")
def wellknown(file):
    return send_from_directory(app.static_folder, ("well-known/%s" % file))
