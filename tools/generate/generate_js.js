const fs = require('fs-extra');

node_module_files = [
  'highcharts/highcharts-more.js',
  'highcharts/highstock.js',
  'highcharts/modules/exporting.js',
  'highcharts/highcharts-more.js.map',
  'highcharts/highstock.js.map',
  'highcharts/modules/exporting.js.map'
];

const generate_js = async () => {
  console.log(`\n Copying JavaScript Libraries from node_modules`);
  for (let idx in node_module_files) {
    const file = node_module_files[idx]
    const filename = file.replace(/.*\//,'');
    console.log(" Copying ", filename);
    fs.copy(
      './node_modules/' + file,
      './static/js/' + filename,
    );
  }
};

module.exports = {
  generate_js,
};
