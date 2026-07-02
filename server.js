const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

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
// Local fallback static file router
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const distDir = path.resolve(__dirname, 'dist');

  // Normalize and sanitize the request path early to break the taint chain.
  // path.posix.normalize collapses redundant slashes/dots, then we reject
  // anything containing traversal segments or characters outside a strict
  // allowlist before the value ever reaches a file-system call.
  let filePath = path.posix.normalize(req.path.replace(/^\/+/, ''));

  if (filePath.includes('..') || !/^[a-zA-Z0-9._\-/]*$/.test(filePath)) {
    return next();
  }

  if (!filePath || filePath === '.') {
    filePath = 'index.html';
  } else if (req.path.endsWith('/')) {
    filePath = `${filePath}/index.html`;
  }

  // Resolve the dist directory to its real path to guard against symlink escapes.
  let realDistDir;
  try {
    realDistDir = fs.realpathSync(distDir);
  } catch {
    return next();
  }

  const fullPath = path.resolve(realDistDir, filePath);
  const indexFullPath = path.resolve(realDistDir, filePath, 'index.html');

  const isWithinDist = (candidatePath) => {
    const rel = path.relative(realDistDir, candidatePath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  };

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const realFullPath = fs.realpathSync(fullPath);
    if (isWithinDist(realFullPath)) {
      return res.sendFile(realFullPath);
    }
  } else if (fs.existsSync(indexFullPath) && fs.statSync(indexFullPath).isFile()) {
    const realIndexFullPath = fs.realpathSync(indexFullPath);
    if (isWithinDist(realIndexFullPath)) {
      return res.sendFile(realIndexFullPath);
    }
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
