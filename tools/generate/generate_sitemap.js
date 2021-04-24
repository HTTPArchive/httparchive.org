const fs = require('fs-extra');
const { get_static_pages, get_last_update_json, get_report_config } = require('./shared');
const ejs = require('ejs');

const min_publish_date = '2019-11-11';
const sitemap_template = `templates/sitemap.ejs.xml`;
const sitemap_path = `templates/sitemap.xml`;

let file_dates = {};

const generate_sitemap = async () => {

  const static_pages = get_static_pages();
  file_dates = await get_last_update_json();

  let urls = [];

  // Get the sitemap entries for static pages
  for (const loc of static_pages) {
    if (fs.existsSync(`templates/${loc}`)) {
      const lastmod = get_lastmod_date(loc);
      const url = convert_file_name(loc);

      urls.push({ url, lastmod });
    }
  }

  // Get the sitemap entries for reports
  const report_config = await get_report_config();
  for (const report of report_config._reports) {
    const loc = `reports/${report}`;
      const lastmod = get_lastmod_date(loc);
      const url = convert_file_name(loc);

      urls.push({ url, lastmod });
  }

  // Sort the urls to prevent needless change
  urls.sort((a,b) => (a.url).localeCompare(b.url));

  let sitemap = await ejs.renderFile(sitemap_template, { urls });
  await fs.outputFile(sitemap_path, sitemap, 'utf8');

  console.log(`\n Generating sitemap.xml`);

  return sitemap_path;
};

const get_lastmod_date = (file) => {
  let lastmod = file_dates[file] ? file_dates[file].date_modified : min_publish_date;
  if (lastmod.length > 10) lastmod = lastmod.substr(0, 10);
  if (lastmod < min_publish_date) lastmod = min_publish_date;
  return lastmod;
};

const convert_file_name = (url) => {
  if ( url.substr(url.length - 10) == "index.html" ) {
    return url.substr(0, url.length - 10);
  };
  if ( url.endsWith(".html")) {
    return url.substr(0, url.length - 5).replace(/_/g,'-');
  };
  return url.replace(/_/g,'-');
};

module.exports = {
  generate_sitemap
};
