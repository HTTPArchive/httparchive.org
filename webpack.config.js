const path = require('path');


module.exports = {
  entry: {
    'faq': './src/js/faq.js',
    'index': './src/js/index.js',
    'main': './src/js/main.js',
    'report': './src/js/report.js',
    'histogram': './src/js/histogram.js',
    'timeseries': './src/js/timeseries.js',
    'send-web-vitals': './src/js/send-web-vitals.js',

    // Techreport
    'techreport': './src/js/techreport/index.js',
    'techreport/timeseries': './src/js/techreport/timeseries.js',
    'techreport/section': './src/js/techreport/section.js',

    // TO UPDATE:
    'summaryLinked': './src/js/components/summaryLinked.js',
    'tableGeneral': './src/js/components/tableGeneral.js',
    'tableGeneralMulti': './src/js/components/tableGeneralMulti.js',
    'tableOverview': './src/js/components/tableOverview.js',
    'tableCWVOverviewMulti': './src/js/components/tableCWVOverviewMulti.js',
  },
  output: {
    path: path.resolve(__dirname, 'static/js'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)|(static)/,
      }
    ]
  }
};
