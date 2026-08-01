const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const {
  get_static_pages,
  map_to_astro_page,
  get_last_update_json_filename,
  get_last_update_json,
  get_report_config
} = require('./shared');

let file_dates = {};
let now = '';

const check_and_update_date = (file, hash) => {
  if (file_dates[file]) {
    if (file_dates[file].hash !== hash) {
      console.log(`Updating existing date for: ${file} to ${now}`);
      file_dates[file].hash = hash;
      file_dates[file].date_modified = now;
      return;
    }
    return;
  }

  console.log(`Adding new date for: ${file} to ${now}`);
  file_dates[file] = {
    date_published: now,
    date_modified: now,
    hash: hash
  };
};

const get_template_pages_dates = async () => {
  const static_pages = get_static_pages();

  for (const file of static_pages) {
    const astro_page = map_to_astro_page(file);
    if (fs.existsSync(astro_page)) {
      let content = await fs.readFile(astro_page, 'utf-8');
      if (file === 'faq.html' && fs.existsSync('docs/faq.md')) {
        content += await fs.readFile('docs/faq.md', 'utf-8');
      }
      const hash = crypto.createHash('md5').update(content).digest('hex');
      check_and_update_date(file, hash);
    }
  }
};

const get_reports_dates = async () => {
  const report_config = await get_report_config();
  if (!report_config?._reports) return;

  for (const report of report_config._reports) {
    if (report_config[report]) {
      const content = JSON.stringify(report_config[report]);
      const hash = crypto.createHash('md5').update(content).digest('hex');
      check_and_update_date(`reports/${report}`, hash);
    }
  }
};

const get_docs_dates = async () => {
  const docsDir = 'src/content/docs/docs';
  if (!fs.existsSync(docsDir)) return;

  try {
    const files = await fs.promises.readdir(docsDir, { recursive: true });
    for (const relativeFile of files) {
      if (!relativeFile.endsWith('.md') && !relativeFile.endsWith('.mdx')) continue;

      const fullPath = path.join(docsDir, relativeFile);
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) continue;

      const normalizedRel = relativeFile.replace(/\\/g, '/');
      const key = `docs/${normalizedRel.replace(/\.mdx?$/, '')}`;

      const content = await fs.readFile(fullPath, 'utf-8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      check_and_update_date(key, hash);
    }
  } catch (err) {
    console.error('Failed to generate doc timestamps:', err);
  }
};

const write_files_dates_file = async () => {
  const last_update_json = get_last_update_json_filename();

  const sorted_dates = {};
  Object.keys(file_dates)
    .sort()
    .forEach((key) => {
      sorted_dates[key] = file_dates[key];
    });
  file_dates = sorted_dates;

  console.log('Writing last_updated.json file');

  try {
    await fs.writeFile(last_update_json, JSON.stringify(file_dates, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to generate file:', err);
  }
};

const generate_timestamps = async () => {
  file_dates = await get_last_update_json();

  const utcDate = new Date();
  now = new Date(Date.UTC(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate())).toISOString();

  await get_template_pages_dates();
  await get_reports_dates();
  await get_docs_dates();
  await write_files_dates_file();
};

(async () => {
  try {
    await generate_timestamps();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
