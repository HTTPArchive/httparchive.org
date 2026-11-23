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

    // Verify button bar exists, table wrapper positioned after bar, and histogram btn aria-disabled + tooltip wired on overall
    const initialCheck = await page.evaluate(() => {
      const bar = document.querySelector('.cwv-button-bar');
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const histBtn = document.getElementById('cwv-distribution-btn');
      const tooltip = document.getElementById('cwv-distribution-tooltip');
      if (!bar || !tw || !histBtn || !tooltip) return null;
      return {
        hasBar: !!bar,
        hasTw: !!tw,
        isTwAfterBar: !(bar.compareDocumentPosition(tw) & Node.DOCUMENT_POSITION_PRECEDING),
        isHistBtnDisabledOnOverall: histBtn.getAttribute('aria-disabled') === 'true',
        isHistBtnVisible: !histBtn.classList.contains('hidden'),
        hasDescribedBy: histBtn.getAttribute('aria-describedby') === 'cwv-distribution-tooltip',
        hasInterestFor: histBtn.getAttribute('interestfor') === 'cwv-distribution-tooltip',
        tooltipRole: tooltip.getAttribute('role'),
        tooltipPopover: tooltip.getAttribute('popover'),
      };
    });

    if (!initialCheck || !initialCheck.isTwAfterBar) {
      console.error('❌ [FAIL] CWV button bar or table wrapper not properly positioned');
      failures++;
    } else if (
      !initialCheck.isHistBtnDisabledOnOverall ||
      !initialCheck.isHistBtnVisible ||
      !initialCheck.hasDescribedBy ||
      !initialCheck.hasInterestFor ||
      initialCheck.tooltipRole !== 'tooltip' ||
      initialCheck.tooltipPopover !== 'hint'
    ) {
      console.error('❌ [FAIL] Histogram button should be visible, aria-disabled, and wired to tooltip for overall metric', initialCheck);
      failures++;
    } else {
      console.log('✅ [PASS] Table wrapper positioned after .cwv-button-bar and histogram button aria-disabled with tooltip for overall');
      passes++;
    }

    // Verify focusing disabled histogram button opens tooltip and Escape dismisses it
    await page.focus('#cwv-distribution-btn');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const tooltipOpenOnFocus = await page.evaluate(() => {
      const tooltip = document.getElementById('cwv-distribution-tooltip');
      return tooltip && tooltip.matches(':popover-open');
    });
    await page.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 150));
    const tooltipClosedOnEscape = await page.evaluate(() => {
      const tooltip = document.getElementById('cwv-distribution-tooltip');
      return tooltip && !tooltip.matches(':popover-open');
    });

    if (!tooltipOpenOnFocus || !tooltipClosedOnEscape) {
      console.error('❌ [FAIL] Disabled histogram tooltip should open on focus and close on Escape', { tooltipOpenOnFocus, tooltipClosedOnEscape });
      failures++;
    } else {
      console.log('✅ [PASS] Disabled histogram tooltip opens on focus and dismisses on Escape');
      passes++;
    }

    // Verify clicking disabled histogram button does NOT close an open table panel or open histogram
    const disabledClickGuard = await page.evaluate(() => {
      const bar = document.querySelector('.cwv-button-bar');
      const tableBtn = bar.querySelector('.cwv-show-table-btn');
      const histBtn = document.getElementById('cwv-distribution-btn');
      const tw = document.getElementById('good_cwv_timeseries-table-wrapper');
      const hist = document.getElementById('section-cwv_distribution');

      tableBtn.click();
      const openedTable = !tw.classList.contains('hidden');
      histBtn.click();
      return {
        openedTable,
        twStillOpen: !tw.classList.contains('hidden'),
        histStillHidden: hist.classList.contains('hidden'),
      };
    });
    // Reset table closed before continuing
    await page.evaluate(() => {
      const bar = document.querySelector('.cwv-button-bar');
      bar.querySelector('.cwv-show-table-btn').click();
    });

    if (!disabledClickGuard.openedTable || !disabledClickGuard.twStillOpen || !disabledClickGuard.histStillHidden) {
      console.error('❌ [FAIL] Clicking aria-disabled histogram button closed open table or opened histogram', disabledClickGuard);
      failures++;
    } else {
      console.log('✅ [PASS] Clicking aria-disabled histogram button does not close open panels or open histogram');
      passes++;
    }

    // Switch metric to overall_sn to verify histogram button is also disabled
    const snCheck = await page.evaluate(async () => {
      const select = document.querySelector('select[data-controls="good_cwv_timeseries"]');
      if (select) {
        select.value = 'overall_sn';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 300));
      const histBtn = document.getElementById('cwv-distribution-btn');
      return (
        histBtn &&
        histBtn.getAttribute('aria-disabled') === 'true' &&
        histBtn.getAttribute('aria-describedby') === 'cwv-distribution-tooltip' &&
        histBtn.getAttribute('interestfor') === 'cwv-distribution-tooltip' &&
        !histBtn.classList.contains('hidden')
      );
    });

    if (!snCheck) {
      console.error('❌ [FAIL] Histogram button should be visible and aria-disabled with tooltip for overall_sn metric');
      failures++;
    } else {
      console.log('✅ [PASS] Histogram button aria-disabled for overall_sn');
      passes++;
    }

    // Switch metric to LCP so histogram button becomes enabled and tooltip attributes are removed
    await page.evaluate(() => {
      const select = document.querySelector('select[data-controls="good_cwv_timeseries"]');
      if (select) {
        select.value = 'LCP';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lcpCheck = await page.evaluate(() => {
      const histBtn = document.getElementById('cwv-distribution-btn');
      const tooltip = document.getElementById('cwv-distribution-tooltip');
      return (
        histBtn &&
        histBtn.getAttribute('aria-disabled') === null &&
        histBtn.getAttribute('aria-describedby') === null &&
        histBtn.getAttribute('interestfor') === null &&
        tooltip &&
        !tooltip.matches(':popover-open')
      );
    });

    if (!lcpCheck) {
      console.error('❌ [FAIL] Histogram button should be enabled without tooltip attributes for LCP metric');
      failures++;
    } else {
      console.log('✅ [PASS] Histogram button enabled and tooltip attributes removed for LCP');
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
