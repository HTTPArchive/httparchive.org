from flask import request, redirect
import logging
from time import time
from urllib.parse import urlparse


from . import app, render_template, legacy_util, url_for


@app.errorhandler(400)
def bad_request(e):
    return render_template("error/400.html", error=e), 400


@app.errorhandler(404)
def page_not_found(e):
    url = urlparse(request.url)
    path = url.path
    if legacy_util.should_redirect(path):
        page = legacy_util.get_redirect_page(path)
        redirect_url = url_for(page.name, **page.kwargs)
        response = app.make_response(redirect(redirect_url, code=301))
        # Set a cookie that expires 5 seconds after page load,
        # to ensure that it is only shown once per redirect.
        # Since the redirects are permanent (301) this should only be
        # shown to users the first time they hit each legacy URL.
        expiration = time() + 5
        response.set_cookie("legacy_welcome", "1", expires=expiration)
        return response

    return render_template("error/404.html", error=e, path=path), 404


@app.errorhandler(500)
def server_error_500(e):  # pragma: no cover
    logging.exception("An error occurred during a request.")
    return render_template("error/500.html", error=e), 500


@app.errorhandler(502)
def server_error_502(e):  # pragma: no cover
    return render_template("error/502.html", error=e), 502
