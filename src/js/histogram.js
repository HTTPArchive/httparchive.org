import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, formatNumber, prettyDate, drawMetricSummary, callOnceWhenVisible } from './utils';
import Chart from 'chart.js/auto'
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Register all Chart.js components and the Zoom plugin
Chart.register(zoomPlugin);

function histogram(metric, date, options) {
  options.date = date;
  options.metric = metric;
  options.chartId = `${metric}-chart`;

  const dataUrl = `https://cdn.httparchive.org/reports/${options.lens ? `${options.lens.id}/` : ''}${date}/${metric}.json`;
  fetch(dataUrl)
    .then(response => {
      if (!response.ok) {
        console.error('Error loading histogram data', dataUrl, response);
        return Promise.reject(response.statusText);
      }
      return response.text();
    })
    .then(jsonStr => JSON.parse(jsonStr))
    .then(data => {
      drawHistogram(data, `${metric}-chart`, options);
      drawHistogramTable(data, `${metric}-table-desktop`, `${metric}-table-mobile`, options.type);
    }).catch(e => {
      const chart = document.getElementById(`${metric}-chart`);
      chart.textContent = `Error loading data: ${e}. Try a more recent start date.`;
    });
}

function drawClientSummary(data, options, client) {
  if (!data.length) {
    return;
  }

  const value = getSummary(data, options);
  drawMetricSummary(options, client, value);
}

function getSummary(data, options) {
  const summary = getPrimaryMetric(data, options);
  const metric = new Metric(options, summary);

  return metric.toString();
}

function getPrimaryMetric(data, options) {
  data = data.filter(o => +o.cdf > 0.5);
  if (!data.length) {
    return '?';
  }
  return data[0].bin;
}

class Bin {
  constructor(data) {
    this.client = data.client;
    this.bin = +data.bin;
    this.volume = +data.volume;
    this.pdf = +data.pdf;
    this.cdf = +data.cdf;
  }

  toPoint() {
    return {x: this.bin, y: this.pdf * 100};
  }

  toCdfPoint() {
    return [this.bin, this.cdf * 100];
  }

  toRow(maxPdf) {
    const tr = document.createElement('tr');
    this.getSchema().forEach(col => {
      const td = document.createElement('td');
      if (col === 'volume') {
        const bar = document.createElement('div');
        bar.style.width = (this.pdf * 100 / maxPdf) + '%';
        bar.classList.add(this.client);
        td.appendChild(bar);
        const text = document.createElement('span');
        text.textContent = this.format(col);
        td.appendChild(text);
      }
      else {
        td.textContent = this.format(col);
      }
      td.classList.add(col);
      tr.appendChild(td);
    })
    return tr;
  }

  add(bin) {
    this.volume += bin.volume;
    this.pdf += bin.pdf;
    this.cdf = Math.max(this.cdf, bin.cdf);
  }

  clone() {
    return new Bin({
      client: this.client,
      bin: this.bin,
      volume: this.volume,
      pdf: this.pdf,
      cdf: this.cdf
    });
  }

  format(property) {
    switch(property) {
      case 'pdf':
      case 'cdf':
        let value = (Math.floor(this[property] * 10000) / 100).toFixed(2);
        if (value < 10) {
          value = '0' + value;
        }
        return value + '%';
      case 'volume':
        return this[property].toLocaleString();
      default:
        return this[property];
    }
  }

  getSchema() {
    return ['bin', 'volume', 'pdf', 'cdf'];
  }
}

class HistogramTable {
  constructor(id, bins, type) {
    this.table = document.getElementById(id);
    this.bins = bins;
    this.type = type;
    this.schema = bins[0].getSchema();
    this.maxPdf = Math.max.apply(null, this.bins.map(bin => bin.pdf));
  }

  draw() {
    Array.from(this.table.children).forEach(child => this.table.removeChild(child));

    const thead = el('thead');
    const headerRow = el('tr');
    this.schema.forEach(col => {
      const th = el('th');
      th.textContent = col === 'bin' ? this.type : col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    const tbody = el('tbody');
    this.bins.forEach(bin => {
      tbody.appendChild(bin.toRow(this.maxPdf));
    });
    this.table.appendChild(tbody);
  }
}


let redrawHistogramTable = null;
function drawHistogramTable(data, desktopId, mobileId, type, [start, end]=[-Infinity, Infinity]) {
  if (!redrawHistogramTable) {
    // Return a curried function to redraw the table given start/end bins.
    redrawHistogramTable = debounce((dateRange) => {
      return drawHistogramTable(data, desktopId, mobileId, type, dateRange);
    }, 100);
  }

  const bins = data.filter(data => {
    return data.bin >= start && data.bin <= end
  }).map(data => new Bin(data));

  const desktop = bins.filter(data => data.client === 'desktop');
  const mobile = bins.filter(data => data.client === 'mobile');

  if (desktop.length) {
    (new HistogramTable(desktopId, desktop, type)).draw();
  }
  if (mobile.length) {
    (new HistogramTable(mobileId, mobile, type)).draw();
  }
}

function drawHistogram(data, containerId, options) {
  // Outliers must be at least this bin index, regardless of CDF.
  // This guarantees 30 bins worth of non-outlier data.
  // Important for histograms that are extremely skewed,
  // eg where the first bin is already 90+% PDF.
  const OUTLIER_MIN = 30;
  data = data.map((data) => new Bin(data));

  let desktop = data.filter(({client}) => client=='desktop');
  let mobile = data.filter(({client}) => client=='mobile');

  const max = Math.max(OUTLIER_MIN,
    desktop.filter(current => current.cdf < 0.95).length,
    mobile.filter(current => current.cdf < 0.95).length);

  desktop = desktop.filter((_, i) => i < max);
  mobile = mobile.filter((_, i) => i < max);

  let desktopCDF = desktop.map(data => data.toCdfPoint());
  let mobileCDF = mobile.map(data => data.toCdfPoint());

  // Draw summary metrics (derived median).
  drawClientSummary(desktop, options, 'desktop');
  drawClientSummary(mobile, options, 'mobile');

  const series = [];
  if (desktop.length || mobile.length) {
    // Set the axis axis to the combination of both desktop and mobile
    const values = [...new Set(data.map(datapoint => datapoint.bin))];
    const xaxis = {label: 'xaxis', data: values};
    options.xaxis = xaxis;
  }
  if (mobile.length) {
    series.push({
      data: mobile.map((data) => data.toPoint()),
      type: 'bar',
      label: 'Mobile',
      backgroundColor: Colors.MOBILE_ALT,
      borderColor: '#fff',
      pointStyle: false,
      yAxisID: 'y',
    });
    series.push({
      data: mobileCDF,
      type: 'line',
      marker: {
        enabled: false,
        states: {
          hover: {
            enabled: false
          }
        }
      },
      label: 'Mobile Cumulative',
      backgroundColor: Colors.MOBILE_ALT,
      borderColor: Colors.MOBILE_ALT,
      pointStyle: false,
      yAxisID: 'y2',
      showInLegend: false,
    });
    if (desktop.length) {
      series.push({
        data: desktop.map((data) => data.toPoint()),
        type: 'bar',
        pointPlacement: 'between',
        label: 'Desktop',
        backgroundColor: Colors.DESKTOP_ALT,
        borderColor: '#fff',
        pointStyle: false,
        yAxisID: 'y',
      });
      series.push({
        data: desktopCDF,
        type: 'line',
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: false
            }
          }
        },
        label: 'Desktop Cumulative',
        backgroundColor: Colors.DESKTOP_ALT,
        borderColor: Colors.DESKTOP_ALT,
        pointStyle: false,
        yAxisID: 'y2',
        showInLegend: false
      });
    }
  }

  const chart = document.getElementById(`${options.metric}-chart`);
  callOnceWhenVisible(chart, () => {
    drawChart(series, containerId, options);
  });
};

function drawChart(series, containerId, options) {
  console.log('Options:', options);
  console.log('Series:', series);

  const axis = options.xaxis;
  const chartData = [];
  chartData.labels = axis.data;
  chartData.datasets = series;

  const chart = new Chart(
    document.getElementById(options.chartId),
    {
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 20,
          },
        },
        legend: {
          labels: {
            padding: {
                top: 20,
                bottom: 20,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: options.lens ? `${options.lens.name}: ` : '' + `Histogram of ${options.name}`,
            font: {
              family: 'Helvetica, Arial, sans-serif',
              size: 16,
              weight: 'normal',
            },
            padding: {
                top: 20,
            },
          },
          subtitle: {
            display: true,
            text: `Source: httparchive.org (${prettyDate(options.date)})`,
            font: {
              family: 'Helvetica, Arial, sans-serif',
              size: 13,
              weight: 'normal',
            },
            padding: {
                bottom: 70,
            },
          },
          tooltip: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
            titleAlign: 'center',
            callbacks: {
              title: function (context) {
                return `${context[0]?.label} ${options.type}`;
              },
              label: function(context) {
                if (context.dataset?.tooltip?.enabled == false) {
                  return null;
                }
                if (context.dataset.type === 'bar') {
                  return ` ${context.dataset.label}: ${context.raw.y.toFixed(2)}%`;
                }
                return ` ${context.dataset.label}: ${context.raw[1].toFixed(0)}%`;
              },
            }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              filter: function (legendItem, data) {
                const showInLegend = data.datasets[legendItem.datasetIndex]?.showInLegend ?? true;
                return showInLegend;
              },
            },
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
            },
            zoom: {
              drag: {
                enabled: true,
                modifierKey: 'shift',
              },
              wheel: {
                enabled: false,
              },
              pinch: {
                enabled: false,
              },
              mode: 'x',
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            grid: {
              drawOnChartArea: false,
              drawTicks: true,
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              length: 10,
              callback: function (value, index, ticks) {
                return formatNumber(value);
              }
            },
            offset: 0,
          },
          y: {
            title : {
              display: true,
              text: 'Density',
            },
            beginAtZero: true,
          },
          y2: {
            title : {
              display: true,
              text: 'Cumulative Density',
            },
            position: 'right',
            min: 0,
            max: 100,
            ticks: {
              callback: function (value, index, ticks) {
                return `${value}%`;
              },
            },
          }
        },
        datasets: {
          bar: {
            barPercentage: 0.95, // Bars occupy the full category space
            categoryPercentage: 1.0, // Bars overlap completely
            grouped: false,
          },
        },
        transitions: {
          zoom: {
            animation: {
              duration: 0
            },
          },
        },
      },
      plugins: [
        {
          id: 'canvasBackgroundColor',
          beforeDraw: (chart) => {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.fillStyle = 'white'; // Set the entire canvas background color to white
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          },
        },
        {
          id: 'crosshair',
          beforeDraw: function(chart) {
            if (chart.tooltip?._active?.length) {
              const ctx = chart.ctx;
              const tooltip = chart.tooltip._active[0];
              const x = tooltip.element.x;

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, chart.chartArea.top);
              ctx.lineTo(x, chart.chartArea.bottom);
              ctx.lineWidth = 1;
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      ],
      data: chartData,
    }
  );

  // Export as Png
  document.getElementById(`${options.chartId}-download-png`).addEventListener('click', function() {
    const link = document.createElement('a');
    link.href = chart.toBase64Image();
    const filename = options.name.replace(' ','') + 'Histogram.png';
    link.download = filename;
    link.click();
  });

  // Show Query
  document.getElementById(`${options.chartId}-show-query`).addEventListener('click', function() {
    const {metric} = options;
    const url = `https://github.com/HTTPArchive/bigquery/blob/master/sql/timeseries/${metric}.sql`;
    window.open(url, '_blank');
  });

  // Show Buttons now chart is active
  document.getElementById(`${options.chartId}-buttons`)?.classList.remove('hidden');
}

// Export directly to global scope for use by Jinja template.
window.histogram = histogram;
