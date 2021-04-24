const fs = require('fs-extra');
const recursive = require('recursive-readdir');

const static_pages = [
  'index.html',
  'faq.html',
  'about.html',
  'reports.html'
];

const last_update_json = "config/last_updated.json";
const report_json = "config/reports.json";

const get_static_pages = () => {
  return static_pages;
}

const get_last_update_json_filename = () => {
  return last_update_json;
}

const get_last_update_json = async () => {
  return JSON.parse(await fs.readFile(last_update_json, 'utf8'));
}


const find_asset_files = async () => {
  const filter = (file, stats) => {
    const isJS = file && file.endsWith('.js');
    const isCSS = file && file.endsWith('.css');
    const isPDF = file && file.endsWith('.pdf');
    const isDirectory = stats && stats.isDirectory();

    return !isJS && !isCSS && !isPDF && !isDirectory;
  };

  return await recursive('static', [filter]);
};

const get_report_config = async () => {

  let report_config;

  if (fs.existsSync(report_json)) {
    report_config = JSON.parse(await fs.readFile(report_json, 'utf8'));
  }

  return report_config;
}

module.exports = {
  get_static_pages,
  get_last_update_json_filename,
  get_last_update_json,
  find_asset_files,
  get_report_config
};
