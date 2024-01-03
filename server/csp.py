csp = {
    "default-src": "'self'",
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": [
        "'self'",
        "'strict-dynamic'",
        "cdn.httparchive.org",
        "www.google-analytics.com",
        "use.fontawesome.com",
        "cdn.speedcurve.com",
        "spdcrv.global.ssl.fastly.net",
        "lux.speedcurve.com",
        "'unsafe-inline'",
        "dev-gw-2vzgiib6.ue.gateway.dev"
    ],
    "font-src": ["'self'"],
    "connect-src": [
        "'self'",
        "cdn.httparchive.org",
        "discuss.httparchive.org",
        "dev.to",
        "cdn.rawgit.com",
        "www.webpagetest.org",
        "www.google-analytics.com",
        "analytics.google.com",
        "*.analytics.google.com",
        "stats.g.doubleclick.net",
        "dev-gw-2vzgiib6.ue.gateway.dev"
    ],
    "img-src": ["'self'", "https:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
}
