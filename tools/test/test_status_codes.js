const fs = require("fs-extra");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const convert = require('xml-js');

const base_url = "http://127.0.0.1:8080";

const output_dir = `static/html`;

let failures = 0;
let passes = 0;

const test_status_code = async (page, status, location) => {

  if (location == undefined) {
    location = null;
  } else if (!location.startsWith('http')) {
    location = base_url + location;
  }

  try {

    // Don't follow redirects
    const options = {
      redirect: 'manual'
    };

    const response = await fetch(base_url + page, options);

    if (response.status === status && response.headers.get('location') === location) {
      //console.log('Success - expected:', status, 'got:',response.status, 'for page:', page);
      passes++;
      if (status === 200 && response.headers.get('content-type').startsWith('text/html')) {
        if (page.slice(-1) === '/') page = page + 'index';
        page = page + '.html';
        const body = await response.text();
        await fs.outputFile(output_dir + page, body, 'utf8');
      }
    } else {
      console.error('Failed - expected:', status, 'got:', response.status, 'for page:', page, 'location:', location);
      failures++;
    }

  } catch (error) {
    console.error('Error - expected:', status, 'for page:', page);
    console.log(error);
    failures++;
  }
};

const test_sitemap_pages = async () => {
  const xml = await fs.readFile(`templates/sitemap.xml`, 'utf-8');
  const sitemap = JSON.parse(convert.xml2json(xml, {compact: true}));
  const urls = sitemap['urlset']['url'];
  for ( var url in urls ) {
    let page = urls[url]['loc']['_text'].trim();
    page = page.replace('https://httparchive.org', '');
    await test_status_code(page, 200);
  }
}

const test_status_codes = async () => {

  // Test success pages
  await test_sitemap_pages();
  await test_status_code('/reports/state-of-the-web?lens=drupal&start=2018_04_15&end=latest&view=list', 200);
  await test_status_code('/reports/state-of-the-web?lens=drupal', 200);
  await test_status_code('/reports/state-of-the-web?start=2018_04_15&end=latest', 200);
  await test_status_code('/reports/state-of-the-web?view=grid', 200);
  await test_status_code('/reports/cwv-tech', 302, 'https://datastudio.google.com/u/0/reporting/55bc8fad-44c2-4280-aa0b-5f3f0cd3d2be/page/M6ZPC');

  // Test non-sitemap pages
  await test_status_code('/sitemap.xml', 200);
  await test_status_code('/robots.txt', 200);
  await test_status_code('/favicon.ico', 200);

  //Test 404s
  await test_status_code('/zz/', 404);
  await test_status_code('/base/', 404);

  console.log('Passes:', passes, "Failures:", failures);
  process.exitCode = failures;

}

module.exports = {
    test_status_codes
};
