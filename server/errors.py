"""
Slim error handlers for the Flask API server.
After Astro SSG migration, Flask only handles:
  - 404: Legacy .php URL redirects (index.php, about.php, trends.php, etc.)
  - All other errors: App Engine serves static error pages from dist/
"""
from flask import request, redirect
import logging
from urllib.parse import urlparse


from . import app, legacy_util, faq_util


def url_for(endpoint, **kwargs):
    """Simple url_for for legacy redirects."""
    anchors = {'about': '/about', 'faq': '/faq', 'report': '/reports/{report_id}', 'index': '/'}
    path = anchors.get(endpoint, '/')
    if endpoint == 'report':
        path = path.format(**kwargs)
    anchor = kwargs.get('_anchor')
    if anchor:
        path = f"{path}#{anchor}"
    return path


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
        from time import time
        expiration = time() + 5
        response.set_cookie("legacy_welcome", "1", expires=expiration)
        return response

    # For other 404s, return a simple JSON or let App Engine handle it
    return {"error": "Not found", "path": path}, 404
