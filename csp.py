csp = {
    'default-src': '\'self\'',
    'style-src': [
        '\'self\'',
        '\'unsafe-inline\''
    ],
    'script-src': [
        '\'self\'',
        'cdn.httparchive.org',
        'www.google-analytics.com',
        'use.fontawesome.com',
        'cdn.speedcurve.com',
        'spdcrv.global.ssl.fastly.net',
        'lux.speedcurve.com'
    ],
    'font-src': [
        '\'self\''
    ],
    'connect-src': [
        '\'self\'',
        'cdn.httparchive.org',
        'discuss.httparchive.org',
        'dev.to',
        'cdn.rawgit.com',
        'www.webpagetest.org',
        'www.google-analytics.com',
        'stats.g.doubleclick.net'
    ],
    'img-src': [
        '\'self\'',
        'lux.speedcurve.com',
        'almanac.httparchive.org',
        'discuss.httparchive.org',
        'avatars.discourse.org',
        'www.google-analytics.com',
        'www.google.com',
        's.g.doubleclick.net',
        'stats.g.doubleclick.net',
        'sjc3.discourse-cdn.com',
        'res.cloudinary.com'
    ]
}
