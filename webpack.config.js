const path = require('path');


module.exports = {
  entry: {
    'faq': './src/js/faq.js',
    'index': './src/js/index.js',
    'main': './src/js/main.js',
    'report': './src/js/report.js',
    'techreport': './src/js/techreport.js',
    'histogram': './src/js/histogram.js',
    'timeseries': './src/js/timeseries.js',
    'send-web-vitals': './src/js/send-web-vitals.js',
    'drilldownHeader': './src/js/components/drilldownHeader.js',
    'summaryLinked': './src/js/components/summaryLinked.js',
    'tableOverview': './src/js/components/tableOverview.js',
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
