const fs = require('fs-extra');
const path = require('path');

const static_pages = [
  'index.html',
  'faq.html',
  'about.html',
  'reports.html'
];

const last_update_json = 'config/last_updated.json';
const report_json = 'config/reports.json';

const get_static_pages = () => {
  return static_pages;
};

const map_to_astro_page = (loc) => {
  if (loc === 'reports.html') {
    return 'src/pages/reports/index.astro';
  }
  return `src/pages/${loc.replace('.html', '.astro')}`;
};

const get_last_update_json_filename = () => {
  return last_update_json;
};

const get_last_update_json = async () => {
  return JSON.parse(await fs.readFile(last_update_json, 'utf8'));
};

const get_report_config = async () => {
  let report_config;
  if (fs.existsSync(report_json)) {
    report_config = JSON.parse(await fs.readFile(report_json, 'utf8'));
  }
  return report_config;
};

module.exports = {
  get_static_pages,
  map_to_astro_page,
  get_last_update_json_filename,
  get_last_update_json,
  get_report_config
};
