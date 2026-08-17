import Highcharts from 'highcharts/highstock';
import HighchartsMore from 'highcharts/highcharts-more';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';
import Accessibility from 'highcharts/modules/accessibility';

// Initialize Highcharts modules
HighchartsMore(Highcharts);
Exporting(Highcharts);
ExportData(Highcharts);
Accessibility(Highcharts);

// Expose globally for existing timeseries.js / histogram.js / techreports / etc.
window.Highcharts = Highcharts;
