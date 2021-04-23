const fs = require('fs-extra');
const { get_static_pages, get_last_update_json_filename, get_last_update_json, find_asset_files, get_report_config } = require('./shared');
const crypto = require('crypto');

let file_dates = {};

let now = "";

const check_and_update_date = (file, hash, size) => {

  if (file_dates[file]) {

    if (file_dates[file].hash !== hash) {
      console.log("Updating existing date for: " + file + " to " + now);
      file_dates[file].hash = hash;
      file_dates[file].date_modified = now;
      if (size) file_dates[file].size = size;
      return;
    }

    // No update to be done
    return;
  }

  console.log("Adding new date for: " + file + " to " + now);
  if (size) {
    file_dates[file] = {
      "date_published": now,
      "date_modified": now,
      "hash": hash,
      "size": size
    };
  } else {
    file_dates[file] = {
      "date_published": now,
      "date_modified": now,
      "hash": hash
    };
  }

}

const get_asset_file_dates = async () => {

  for (const file of await find_asset_files()) {

    // Read the content of the file
    let content = await fs.readFile(file, 'utf-8');
    let hash = crypto.createHash('md5').update(content).digest("hex")
    let size = null;
    if (file.endsWith('.pdf')) {
      size = Math.round(fs.statSync(file).size / (1024*1024),0);
    }
    check_and_update_date('/' + file, hash, size);

  }
};

const get_template_pages_dates = async () => {

  const static_pages = get_static_pages();

  for (const file of static_pages) {
    if (fs.existsSync(`templates/${file}`)) {
      let content = await fs.readFile(`templates/${file}`, 'utf-8');
      let hash = crypto.createHash('md5').update(content).digest("hex");
      check_and_update_date(file, hash, null);
    }
  }
};

const get_reports_dates = async () => {

  const report_config = await get_report_config();

  for (const report of report_config._reports) {
    if (report_config[report]) {
      let content = JSON.stringify(report_config[report]);
      let hash = crypto.createHash('md5').update(content).digest("hex");
      check_and_update_date(`reports/${report}`, hash, null);
    }
  }
};


const write_files_dates_file = async () => {

  const last_update_json = get_last_update_json_filename();

  // Sort order is not guaranteed, so let's sort just to make sure no meaningless changes
  var sorted_dates = {};
  Object.keys(file_dates).sort().forEach(function(key) {
    sorted_dates[key] = file_dates[key];
  });
  file_dates = sorted_dates;

  console.log("Writing file")

  try {
    fs.writeFile(last_update_json, JSON.stringify(file_dates, null, 2), (err) => {
      if (err) console.log('Error')
    });
  } catch(err) {
    console.error('  Failed to generate file' + err);
  }
}

const generate_timestamps = async () => {

  const file_dates = await get_last_update_json();

  now = new Date(Date.now());
  now = new Date (Date.UTC(now.getFullYear(),now.getMonth(), now.getDate())).toISOString();
  
  await get_template_pages_dates();
  await get_reports_dates();
  await get_asset_file_dates();
  await write_files_dates_file();

}

(async () => {
  try {
    await generate_timestamps();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();


