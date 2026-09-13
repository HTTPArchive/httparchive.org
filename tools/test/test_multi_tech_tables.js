const puppeteer = require('puppeteer');

const base_url = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

const test_multi_tech_tables = async () => {
  console.log('\n--- Running Multi-Technology Comparison Table Header Tests ---');
  let passes = 0;
  let failures = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    const url = `${base_url}/reports/techreport/tech?client=desktop&good-cwv-over-time=LCP&tech=WordPress,Shopify,Wix,Squarespace,Drupal`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await page.evaluate(() => {
      const timeseriesTables = [
        'table-comparison_good_cwv_timeseries',
        'table-comparison_lighthouse_timeseries',
        'table-comparison_weight_timeseries',
        'table-comparison_adoption_timeseries',
      ];

      return timeseriesTables.map((tableId) => {
        const table = document.getElementById(tableId);
        if (!table) return { tableId, exists: false };

        const theadThs = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
        const firstRowTds = Array.from(table.querySelectorAll('tbody tr:first-child > *')).map((td) => td.textContent.trim());

        return {
          tableId,
          exists: true,
          theadThs,
          firstRowTds,
          theadCount: theadThs.length,
          tbodyColCount: firstRowTds.length,
          hasAllTechnologies: theadThs.includes('All technologies'),
          hasIndividualTechs:
            theadThs.includes('WordPress') &&
            theadThs.includes('Shopify') &&
            theadThs.includes('Wix') &&
            theadThs.includes('Squarespace') &&
            theadThs.includes('Drupal'),
        };
      });
    });

    result.forEach((t) => {
      if (!t.exists) {
        console.error(`❌ [FAIL] ${t.tableId} not found`);
        failures++;
      } else if (t.hasAllTechnologies) {
        console.error(`❌ [FAIL] ${t.tableId} still contains 'All technologies' header`);
        failures++;
      } else if (!t.hasIndividualTechs) {
        console.error(`❌ [FAIL] ${t.tableId} missing individual technology headers:`, t.theadThs);
        failures++;
      } else if (t.theadCount !== t.tbodyColCount) {
        console.error(`❌ [FAIL] ${t.tableId} header count (${t.theadCount}) does not match body column count (${t.tbodyColCount})`);
        failures++;
      } else {
        console.log(`✅ [PASS] ${t.tableId} correctly displays all technology columns matching table data`);
        passes++;
      }
    });

    await page.close();
  } finally {
    await browser.close();
  }

  console.log(`\nMulti-Technology Table Tests: Passes: ${passes}, Failures: ${failures}`);
  if (failures > 0) {
    process.exitCode = failures;
  }
  return { passes, failures };
};

module.exports = {
  test_multi_tech_tables,
};
