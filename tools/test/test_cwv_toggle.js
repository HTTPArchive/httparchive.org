const puppeteer = require('puppeteer');

const base_url = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

const test_cwv_toggle = async () => {
  console.log('\n--- Running CWV Button Bar Toggle Tests ---');
  let passes = 0;
  let failures = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    const url = `${base_url}/reports/techreport/tech?tech=WordPress`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Verify button bar exists and table wrapper was positioned after button bar
    const initialCheck = await page.evaluate(() => {
      const bar = document.querySelector('.cwv-button-bar');
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      if (!bar || !tw) return null;
      return {
        hasBar: !!bar,
        hasTw: !!tw,
        isTwAfterBar: !(bar.compareDocumentPosition(tw) & Node.DOCUMENT_POSITION_PRECEDING),
      };
    });

    if (!initialCheck || !initialCheck.isTwAfterBar) {
      console.error('❌ [FAIL] CWV button bar or table wrapper not properly positioned');
      failures++;
    } else {
      console.log('✅ [PASS] Table wrapper positioned after .cwv-button-bar');
      passes++;
    }

    // Step 1: Click "Show table" -> table should show, others hidden
    const step1 = await page.evaluate(() => {
      const bar = document.querySelector('.cwv-button-bar');
      const tableBtn = bar.querySelector('.cwv-show-table-btn');
      tableBtn.click();
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const geo = document.getElementById('section-geo_breakdown');
      const hist = document.getElementById('section-cwv_distribution');
      return {
        twHidden: tw.classList.contains('hidden'),
        geoHidden: geo.classList.contains('hidden'),
        histHidden: hist.classList.contains('hidden'),
        tableBtnText: tableBtn.textContent.trim(),
      };
    });

    if (!step1.twHidden && step1.geoHidden && step1.histHidden && step1.tableBtnText === 'Hide table') {
      console.log('✅ [PASS] Click Show table: table opened, button says "Hide table"');
      passes++;
    } else {
      console.error('❌ [FAIL] Click Show table failed:', step1);
      failures++;
    }

    // Step 2: Click "Show geographic breakdown" -> table hides, geo shows
    const step2 = await page.evaluate(() => {
      const geoBtn = document.getElementById('geo-breakdown-btn');
      geoBtn.click();
      const bar = document.querySelector('.cwv-button-bar');
      const tableBtn = bar.querySelector('.cwv-show-table-btn');
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const geo = document.getElementById('section-geo_breakdown');
      const hist = document.getElementById('section-cwv_distribution');
      return {
        twHidden: tw.classList.contains('hidden'),
        geoHidden: geo.classList.contains('hidden'),
        histHidden: hist.classList.contains('hidden'),
        tableBtnText: tableBtn.textContent.trim(),
        geoBtnText: geoBtn.textContent.trim(),
      };
    });

    if (step2.twHidden && !step2.geoHidden && step2.histHidden && step2.tableBtnText === 'Show table' && step2.geoBtnText === 'Hide geographic breakdown') {
      console.log('✅ [PASS] Click Show geographic breakdown: table closed, geo breakdown opened');
      passes++;
    } else {
      console.error('❌ [FAIL] Click Show geographic breakdown failed:', step2);
      failures++;
    }

    // Step 3: Click "Show histogram" -> geo hides, histogram shows
    const step3 = await page.evaluate(() => {
      const histBtn = document.getElementById('cwv-distribution-btn');
      histBtn.click();
      const geoBtn = document.getElementById('geo-breakdown-btn');
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const geo = document.getElementById('section-geo_breakdown');
      const hist = document.getElementById('section-cwv_distribution');
      return {
        twHidden: tw.classList.contains('hidden'),
        geoHidden: geo.classList.contains('hidden'),
        histHidden: hist.classList.contains('hidden'),
        geoBtnText: geoBtn.textContent.trim(),
        histBtnText: histBtn.textContent.trim(),
      };
    });

    if (step3.twHidden && step3.geoHidden && !step3.histHidden && step3.geoBtnText === 'Show geographic breakdown' && step3.histBtnText === 'Hide histogram') {
      console.log('✅ [PASS] Click Show histogram: geo breakdown closed, histogram opened');
      passes++;
    } else {
      console.error('❌ [FAIL] Click Show histogram failed:', step3);
      failures++;
    }

    // Step 4: Click "Hide histogram" -> all hidden
    const step4 = await page.evaluate(() => {
      const histBtn = document.getElementById('cwv-distribution-btn');
      histBtn.click();
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const geo = document.getElementById('section-geo_breakdown');
      const hist = document.getElementById('section-cwv_distribution');
      return {
        twHidden: tw.classList.contains('hidden'),
        geoHidden: geo.classList.contains('hidden'),
        histHidden: hist.classList.contains('hidden'),
        histBtnText: histBtn.textContent.trim(),
      };
    });

    if (step4.twHidden && step4.geoHidden && step4.histHidden && step4.histBtnText === 'Show histogram') {
      console.log('✅ [PASS] Click Hide histogram: all panels hidden');
      passes++;
    } else {
      console.error('❌ [FAIL] Click Hide histogram failed:', step4);
      failures++;
    }

    await page.close();
  } finally {
    await browser.close();
  }

  console.log(`\nCWV Button Bar Toggle Tests: Passes: ${passes}, Failures: ${failures}`);
  if (failures > 0) {
    process.exitCode = failures;
  }
  return { passes, failures };
};

module.exports = {
  test_cwv_toggle,
};
