const fs = require('fs-extra');

const node_module_files = [
  'highcharts/highcharts.js',
  'highcharts/highcharts-more.js',
  'highcharts/highstock.js',
  'highcharts/modules/accessibility.js',
  'highcharts/modules/export-data.js',
  'highcharts/modules/exporting.js'
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
  console.log(`\n Generating web-vitals.js`);
  fs.copy(
    './node_modules/web-vitals/dist/web-vitals.attribution.umd.cjs',
    './static/js/web-vitals.js',
  );
};

module.exports = {
  generate_js,
};
