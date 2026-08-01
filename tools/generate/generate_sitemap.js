const fs = require('fs-extra');
const { get_static_pages, map_to_astro_page, get_last_update_json, get_report_config } = require('./shared');
const ejs = require('ejs');

const min_publish_date = '2019-11-11';
const sitemap_template = 'templates/sitemap.ejs.xml';
const sitemap_path = 'public/sitemap.xml';

let file_dates = {};

const generate_sitemap = async () => {
  const static_pages = get_static_pages();
  file_dates = await get_last_update_json();

  const urls = [];

  // Get the sitemap entries for static pages
  for (const loc of static_pages) {
    const astro_page = map_to_astro_page(loc);
    if (fs.existsSync(astro_page)) {
      const lastmod = get_lastmod_date(loc);
      const url = convert_file_name(loc);
      urls.push({ url, lastmod });
    }
  }

  // Get the sitemap entries for reports
  const report_config = await get_report_config();
  if (report_config?._reports) {
    for (const report of report_config._reports) {
      if (report_config[report]?.url?.startsWith('http')) {
        console.log(`Skipping ${report} as it has an external url\n`);
      } else if (report_config[report]?.url?.startsWith('/')) {
        const loc = `reports/${report}`;
        const lastmod = get_lastmod_date(loc);
        const url = report_config[report].url.slice(1);
        urls.push({ url, lastmod });
      } else {
        const loc = `reports/${report}`;
        const lastmod = get_lastmod_date(loc);
        const url = convert_file_name(loc);
        urls.push({ url, lastmod });
      }
    }
  }

  // Get sitemap entries for documentation pages
  for (const key of Object.keys(file_dates)) {
    if (key.startsWith('docs/')) {
      const lastmod = get_lastmod_date(key);
      const url = key === 'docs/index' ? 'docs/' : key;
      urls.push({ url, lastmod });
    }
  }

  // Sort the urls to prevent needless change
  urls.sort((a, b) => a.url.localeCompare(b.url));

  const sitemap = await ejs.renderFile(sitemap_template, { urls });
  await fs.outputFile(sitemap_path, sitemap, 'utf8');

  console.log('\n Generating sitemap.xml');

  return sitemap_path;
};

const get_lastmod_date = (file) => {
  let lastmod = file_dates[file] ? file_dates[file].date_modified : min_publish_date;
  if (lastmod.length > 10) lastmod = lastmod.slice(0, 10);
  if (lastmod < min_publish_date) lastmod = min_publish_date;
  return lastmod;
};

const convert_file_name = (url) => {
  if (url.endsWith('index.html')) {
    return url.slice(0, -10);
  }
  if (url.endsWith('.html')) {
    return url.slice(0, -5).replace(/_/g, '-');
  }
  return url.replace(/_/g, '-');
};

module.exports = {
  generate_sitemap
};
