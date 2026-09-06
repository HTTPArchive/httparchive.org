const puppeteer = require('puppeteer');

const base_url = process.env.TEST_BASE_URL || "http://127.0.0.1:8080";

const test_pages = [
  '/',
  '/about',
  '/faq',
  '/reports',
  '/reports/state-of-the-web',
  '/reports/state-of-the-web?lens=drupal',
  '/reports/state-of-the-web?view=grid',
  '/reports/techreport/landing',
  '/reports/techreport/drilldown',
  '/reports/techreport/comparison',
  '/reports/techreport/tech?tech=ALL',
  '/reports/techreport/tech?tech=WordPress&geo=ALL&rank=ALL&start=2024-01-01&end=2024-03-01',
];

const test_console_errors = async () => {
  console.log('\n--- Running Puppeteer Browser Console & Runtime Error Tests ---');
  let passes = 0;
  let failures = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    for (const pagePath of test_pages) {
      const url = `${base_url}${pagePath}`;
      const page = await browser.newPage();

      const pageErrors = [];
      const consoleErrors = [];

      // Catch uncaught exceptions (ReferenceError, TypeError, etc.)
      page.on('pageerror', error => {
        pageErrors.push(error.message || String(error));
      });

      // Catch console.error calls
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Filter out benign external analytics/CDN network failures in test mode
          if (text.includes('speedcurve') || text.includes('googletagmanager')) {
            return;
          }
          consoleErrors.push(text);
        }
      });

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Wait for async client-side initializers (DOMContentLoaded, API fetches, TechReport instantiation)
        await new Promise(resolve => setTimeout(resolve, 800));

        const errors = [...pageErrors, ...consoleErrors];
        if (errors.length > 0) {
          console.error(`❌ [FAIL] ${pagePath} encountered ${errors.length} error(s):`);
          errors.forEach(e => console.error(`   - ${e}`));
          failures++;
        } else {
          console.log(`✅ [PASS] ${pagePath}`);
          passes++;
        }
      } catch (err) {
        console.error(`❌ [FAIL] ${pagePath} failed to load: ${err.message}`);
        failures++;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nBrowser Runtime Tests: Passes: ${passes}, Failures: ${failures}`);
  if (failures > 0) {
    process.exitCode = failures;
  }
  return { passes, failures };
};

module.exports = {
  test_console_errors
};
