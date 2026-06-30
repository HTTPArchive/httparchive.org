const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 8080;
const GCS_BUCKET = 'httparchive';
const CACHE_LIFETIME = 1000 * 60 * 60 * 3; // 3 hours

// Initialize GCS
let gcs;
let bucket;
let loadDatesFromGCS = true;

try {
  gcs = new Storage();
  bucket = gcs.bucket(GCS_BUCKET);
} catch (e) {
  console.warn('Unable to authenticate to Google Cloud Storage. Using mock dates.', e.message);
  loadDatesFromGCS = false;
}

// ---------------------------------------------------------------------------
// GCS Cache & Utilities
// ---------------------------------------------------------------------------

function getMockDates() {
  const now = new Date();
  const startYear = 2010;
  const endYear = now.getUTCFullYear();
  const monthDelta = now.getUTCMonth() + 1; // 1-indexed

  let year = startYear;
  const months = [];
  const totalMonths = ((endYear - startYear) * 12) + monthDelta;

  for (let month = 1; month <= totalMonths; month++) {
    let currentMonthInYear = month % 12;
    if (currentMonthInYear === 0) {
      currentMonthInYear = 12;
    }
    const monthStr = currentMonthInYear < 10 ? `0${currentMonthInYear}` : `${currentMonthInYear}`;

    months.push(`${year}_${monthStr}_01`);
    if (year < 2019) {
      months.push(`${year}_${monthStr}_15`);
    }

    if (month % 12 === 0) {
      year = year + 1;
    }
  }

  months.sort().reverse();
  return months;
}

const mockDates = getMockDates();
let datesCache = [];
let lastDatesUpdate = 0;

async function getDates() {
  if (!loadDatesFromGCS) {
    return mockDates;
  }
  const now = Date.now();
  if (datesCache.length > 0 && (now - lastDatesUpdate) < CACHE_LIFETIME) {
    return datesCache;
  }

  try {
    const [, , apiResponse] = await bucket.getFiles({
      prefix: 'reports/20',
      delimiter: '/'
    });
    const prefixes = apiResponse.prefixes || [];
    const datePattern = /(\d{4}_\d{2}_\d{2})/;
    const dates = [];

    for (const prefix of prefixes) {
      const match = prefix.match(datePattern);
      if (match) {
        dates.push(match[1]);
      }
    }

    dates.sort().reverse();
    datesCache = dates;
    lastDatesUpdate = now;
    return dates;
  } catch (err) {
    console.error('Error fetching dates from GCS:', err.message);
    return mockDates;
  }
}

const latestMetricDates = Object.create(null);
const latestMetricCheck = Object.create(null);

async function getLatestDate(dates, metricId) {
  if (!loadDatesFromGCS) {
    return mockDates[0];
  }

  const cached = latestMetricDates[metricId];
  const now = Date.now();
  if (cached) {
    if (cached === dates[0] || (now - latestMetricCheck[metricId]) < CACHE_LIFETIME) {
      return cached;
    }
  }

  try {
    for (const date of dates) {
      const file = bucket.file(`reports/${date}/${metricId}.json`);
      const [exists] = await file.exists();
      if (exists) {
        latestMetricDates[metricId] = date;
        latestMetricCheck[metricId] = now;
        return date;
      }
    }
  } catch (err) {
    const safeMetricIdForLog = String(metricId).replace(/[\r\n]/g, '');
    console.error('Error finding latest date for %s:', safeMetricIdForLog, err.message);
  }

  return mockDates[0];
}

let reportsJson = {};
let lastReportsUpdate = 0;

async function loadReportsConfig() {
  const now = Date.now();
  if (Object.keys(reportsJson).length > 0 && (now - lastReportsUpdate) < CACHE_LIFETIME) {
    return reportsJson;
  }
  try {
    reportsJson = await fs.readJson('config/reports.json');
    lastReportsUpdate = now;
  } catch (err) {
    console.error('Error reading config/reports.json:', err.message);
  }
  return reportsJson;
}

async function getMetric(metricId) {
  if (typeof metricId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(metricId)) {
    return null;
  }
  const config = await loadReportsConfig();
  const metrics = config._metrics || {};
  if (!Object.prototype.hasOwnProperty.call(metrics, metricId)) {
    return null;
  }
  const metric = metrics[metricId];
  if (!metric) {
    return null;
  }
  return { ...metric, id: metricId };
}

// ---------------------------------------------------------------------------
// Security Headers Middleware
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Apply CSP header similar to app.yaml for HTML responses
  const isHtml = req.path === '/' || !path.extname(req.path);
  if (isHtml) {
    res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https: data:; connect-src 'self' https:; frame-ancestors 'none'");
  }
  next();
});

// WOFF and WOFF2 caching headers
app.use('/static/fonts', (req, res, next) => {
  if (req.path.endsWith('.woff') || req.path.endsWith('.woff2')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});

// ---------------------------------------------------------------------------
// Subdomain Redirects (www. / beta. / legacy. to bare domain)
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.') || host.startsWith('beta.') || host.startsWith('legacy.')) {
    const canonicalHost = host.replace(/^(www|beta|legacy)\./, '');
    return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
  }
  next();
});

// ---------------------------------------------------------------------------
// JSON Endpoints
// ---------------------------------------------------------------------------

app.get('/metric.json', async (req, res) => {
  const metricId = req.query.id;
  if (!metricId) {
    return res.status(400).json({ status: 400, message: 'id parameter required' });
  }

  const metric = await getMetric(metricId);
  const hasHistogram = metric && (!metric.histogram || metric.histogram.enabled !== false);
  const dates = await getDates();
  const latest = (metric && hasHistogram) ? await getLatestDate(dates, metricId) : null;

  res.json({ status: 200, metric, latest });
});

app.get('/api/dates.json', async (req, res) => {
  const dates = await getDates();
  res.json({ status: 200, dates });
});

// ---------------------------------------------------------------------------
// Static file handlers
// ---------------------------------------------------------------------------
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/static/img/favicon.ico'));
});

app.get('/.well-known/:file', (req, res) => {
  const safeFile = path.basename(req.params.file);
  res.sendFile(path.join(__dirname, 'public/static/well-known', safeFile));
});

// Static assets pass-through
app.use('/static', express.static(path.join(__dirname, 'public/static')));

// ---------------------------------------------------------------------------
// Legacy Redirects
// ---------------------------------------------------------------------------
const legacyPathMap = {
  '/index.php': { page: '/' },
  '/about.php': { page: '/about' },
  '/trends.php': { page: '/reports/state-of-the-web' },
  '/interesting.php': { page: '/reports/state-of-the-web', query: { start: 'latest' } },
  '/downloads.php': { page: '/faq', hash: 'how-do-i-use-bigquery-to-write-custom-queries-over-the-data' }
};

app.use((req, res, next) => {
  const redirectRule = legacyPathMap[req.path];
  if (redirectRule) {
    let target = redirectRule.page;
    const queryParams = new URLSearchParams(redirectRule.query || {});
    const queryString = queryParams.toString();
    if (queryString) {
      target += `?${queryString}`;
    }
    if (redirectRule.hash) {
      target += `#${redirectRule.hash}`;
    }
    res.cookie('legacy_welcome', '1', { maxAge: 5000 });
    return res.redirect(301, target);
  }
  next();
});

// ---------------------------------------------------------------------------
// Local fallback static file router
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const distDir = path.resolve(__dirname, 'dist');
  let filePath = req.path.replace(/^\//, '');

  if (!filePath) {
    filePath = 'index.html';
  } else if (filePath.endsWith('/')) {
    filePath += 'index.html';
  }

  const fullPath = path.resolve(distDir, filePath);

  // Prevent directory traversal
  const relative = path.relative(distDir, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return next();
  }

  const indexFullPath = path.resolve(distDir, filePath, 'index.html');

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return res.sendFile(fullPath);
  } else if (fs.existsSync(indexFullPath) && fs.statSync(indexFullPath).isFile()) {
    return res.sendFile(indexFullPath);
  }

  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
