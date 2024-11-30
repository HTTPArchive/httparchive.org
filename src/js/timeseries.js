import Changelog from './changelog';
import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, prettyDate, chartExportOptions, drawMetricSummary, callOnceWhenVisible } from './utils';
import Chart from 'chart.js/auto'
import zoomPlugin from 'chartjs-plugin-zoom';

// Register all Chart.js components and the Zoom plugin
Chart.register(zoomPlugin);

function timeseries(metric, options, start, end) {
  const dataUrl = `https://cdn.httparchive.org/reports/${options.lens ? `${options.lens.id}/` : ''}${metric}.json`;
  options.chartId = `${metric}-chart`;
  options.tableId = `${metric}-table`;
  options.metric = metric;

  fetch(dataUrl)
    .then(response => response.text())
    .then(jsonStr => JSON.parse(jsonStr))
    .then(data => data.sort((a, b) => a.date < b.date ? -1 : 1))
    .then(data => {
      let [YYYY, MM, DD] = start.split('_');
      options.min = Date.UTC(YYYY, MM - 1, DD);
      [YYYY, MM, DD] = end.split('_');
      options.max = Date.UTC(YYYY, MM - 1, DD);

      // Ensure null values are filtered out.
      data = data.filter(o => getUnformattedPrimaryMetric(o, options) !== null);

      drawTimeseries(data, options);
      drawTimeseriesTable(data, options, [options.min, options.max]);
    });
}

function drawSummary(data, options, start, end) {
  const desktop = data.filter(o => isDesktop(o) && o.timestamp >= start && o.timestamp <= end).map(toNumeric);
  const mobile = data.filter(o => isMobile(o) && o.timestamp >= start && o.timestamp <= end).map(toNumeric);

  drawClientSummary(desktop, options, 'desktop');
  drawClientSummary(mobile, options, 'mobile');
}

function drawClientSummary(data, options, client) {
  if (!data.length) {
    return;
  }

  const value = getSummary(data, options);
  // Assume the metric is not the median if the options have custom fields.
  const isMedian = !(options.timeseries && options.timeseries.fields);
  const change = getChange(data, options);

  drawMetricSummary(options, client, value, isMedian, change);
}

function getSummary(data, options) {
  const o = data[data.length - 1];
  const summary = getPrimaryMetric(o, options);
  const metric = new Metric(options, summary);

  return metric.toString();
}

function getChange(data, options) {
  if (data.length < 2) {
    return;
  }

  let oldestIndex;

  for (let i = 0; i < data.length; i++) {
    if (getPrimaryMetric(data[i], options) > 0) {
      oldestIndex = i;
      break;
    }
  }

  if (oldestIndex === undefined) {
    return;
  }

  const oldest = getPrimaryMetric(data[oldestIndex], options);
  const latest = getPrimaryMetric(data[data.length - 1], options);

  return (latest - oldest) * 100 / oldest;
}

function getPrimaryMetric(o, options) {
  const field = getPrimaryFieldName(o, options);
  const primaryMetric = getUnformattedPrimaryMetric(o, options);
  const formatter = formatters[field];
  if (formatter) {
    return formatter(primaryMetric);
  }
  return primaryMetric;
}

function getPrimaryFieldName(o, options) {
  if (options.timeseries && options.timeseries.fields) {
    return options.timeseries.fields[0];
  }

  return 'p50';
}

function getUnformattedPrimaryMetric(o, options) {
  const field = getPrimaryFieldName(o, options);
  return o[field];
}

function drawTimeseries(data, options) {
  data = data.map(toNumeric);
  const desktop = data.filter(isDesktop);
  const mobile = data.filter(isMobile);

  const series = [];
  if (desktop.length || mobile.length) {
    // Set the axis axis to the combination of both desktop and mobile
    const dates = [...new Set(data.map(item => item.timestamp))];
    const xaxis = {name: 'xaxis', data: dates};
    series.push(xaxis);
  }
  if (desktop.length) {
    if (options.timeseries && options.timeseries.fields) {
      options.timeseries.fields.forEach(field => {
        series.push(getLineSeries('Desktop', desktop.map(o => [o.timestamp, o[field]]), Colors.DESKTOP));
      });
    } else {
      series.push(getLineSeries('Desktop', desktop.map(toLine), Colors.DESKTOP));
      series.push(getAreaSeries('Desktop', desktop.map(toIQR), Colors.DESKTOP));
    }
  }
  if (mobile.length) {
    if (options.timeseries && options.timeseries.fields) {
      options.timeseries.fields.forEach(field => {
        series.push(getLineSeries('Mobile', mobile.map(o => [o.timestamp, o[field]]), Colors.MOBILE));
      });
    } else {
      series.push(getLineSeries('Mobile', mobile.map(toLine), Colors.MOBILE));
      series.push(getAreaSeries('Mobile', mobile.map(toIQR), Colors.MOBILE));
    }
  }

  if (!series.length) {
    console.error('No timeseries data to draw', data, options);
    return;
  }

  getFlagSeries()
    .then(flagSeries => series.push(flagSeries))
    // If the getFlagSeries request fails (503), catch so we can still draw the chart
    .catch(console.error)
    .then(_ => {
      const chart = document.getElementById(options.chartId);
      callOnceWhenVisible(chart, () => drawChart(options, series));
    });

}
let redrawTimeseriesTable = {};
function drawTimeseriesTable(data, options, [start, end]=[-Infinity, Infinity]) {
  start = Math.floor(start);
  end = Math.floor(end);
  if (!redrawTimeseriesTable[options.metric]) {
    // Return a curried function to redraw the table given start/end times.
    redrawTimeseriesTable[options.metric] = debounce((dateRange) => {
      return drawTimeseriesTable(data, options, dateRange);
    }, 100);
  }

  drawSummary(data, options, start, end);

  let cols = DEFAULT_COLS.concat(DEFAULT_FIELDS);
  if (options.timeseries && options.timeseries.fields) {
    cols = DEFAULT_COLS.concat(options.timeseries.fields);
  }

  Promise.resolve(zip(data)).then(data => {
    const table = document.getElementById(options.tableId);
    Array.from(table.children).forEach(child => table.removeChild(child));

    const frag = document.createDocumentFragment();
    const thead = el('thead');

    if (!options.timeseries || !options.timeseries.fields) {
      const trMeta = el('tr');
      trMeta.classList.add('meta-row');
      DEFAULT_COLS.map(col => {
        return el('td');
      }).forEach(td => trMeta.appendChild(td));
      const th = el('th');
      th.classList.add('text-center');
      th.setAttribute('colspan', cols.length - DEFAULT_COLS.length);
      th.textContent = 'Percentile' + (th.colspan === 1 ? '' : 's');
      trMeta.appendChild(th);
      thead.appendChild(trMeta);
    }

    const tr = el('tr');
    cols.map(col => {
      const th = el('th');
      th.textContent = col;
      return th;
    }).forEach(th => tr.appendChild(th));
    thead.appendChild(tr);
    frag.appendChild(thead);

    const tbody = el('tbody');
    data.forEach(([date, arr]) => {
      if (date < start || date > end) {
        return;
      }

      arr.forEach((o, i) => tbody.appendChild(toRow(o, i, arr.length, cols)));
    });
    frag.appendChild(tbody);
    table.appendChild(frag);
  });
}

const isDesktop = o => o.client == 'desktop';
const isMobile = o => o.client == 'mobile';
const toNumeric = ({client, date, ...other}) => {
  return Object.entries(other).reduce((o, [k, v]) => {
    o[k] = +v;
    return o;
  }, {client});
};
const toIQR = o => [o.timestamp, o.p25, o.p75];
const toLine = o => [o.timestamp, o.p50];
const getLineSeries = (name, data, color) => ({
  name,
  type: 'line',
  data,
  color,
  zIndex: 1,
  marker: {
    enabled: false
  }
});
const getAreaSeries = (name, data, color, opacity=0.1) => ({
  name,
  type: 'line',
  subtype: 'areasplinerange',
  linkedTo: ':previous',
  data,
  lineWidth: 0,
  color,
  fillOpacity: opacity,
  zIndex: 0,
  marker: {
    enabled: false,
    states: {
      hover: {
        enabled: false
      }
    }
  }
});
const flags = {};
let changelog = null;
const loadChangelog = () => {
  if (!changelog) {
    changelog = fetch(Changelog.URL).then(response => response.json());
  }

  return changelog;
};
const getFlagSeries = () => loadChangelog().then(data => {
  data.forEach(change => {
    flags[+change.date] = {
      title: change.title,
      desc: change.desc
    };
  });
  // Filter out changes that don't need to be displayed in time series
  data = data.filter(o => o.displayInTimeSeries !== false);
  return {
    type: 'flags',
    name: 'Changelog',
    data: data.map((change, i) => ({
      x: change.date,
      title: String.fromCharCode(65 + (i % 26))
    })),
    clip: false,
    color: '#90b1b6',
    y: 25,
    showInLegend: false
  };
});

async function drawChart(options, series) {

  /*
  const chart = Highcharts.stockChart(options.chartId, {
    metric: options.metric,
    type: 'timeseries',
    chart: {
      zoomType: 'x',
      zooming: {
        mouseWheel: {
          enabled: false
        }
      }
    },
    title: {
      text: `${options.lens ? `${options.lens.name}: ` : '' }` + `Timeseries of ${options.name}`,
      style: {
        "font-weight": "normal"
      }
    },
    subtitle: {
      text: 'Source: <a href="http://httparchive.org">httparchive.org</a>',
      useHTML: true
    },
    legend: {
      enabled: true
    },
    tooltip: {
      crosshairs: true,
      shared: true,
      useHTML: true,
      borderColor: 'rgba(247,247,247,0.85)',
      formatter: function() {
        function getChangelog(changelog) {
          if (!changelog) return '';
          return `<p class="changelog">${changelog.title}</p>`;
        }

        const changelog = flags[this.x];
        const tooltip = `<p style="font-size: smaller; text-align: center;">${Highcharts.dateFormat('%b %e, %Y', this.x)}</p>`;

        // Handle changelog tooltips first.
        if (!this.points) {
          return `${tooltip} ${getChangelog(changelog)}`
        }

        function getRow(points) {
          if (!points.length) return '';
          let label;
          let data;
          if (options.timeseries && options.timeseries.fields) {
            label = points[0].series.name;
            const formatter = formatters[options.timeseries.fields[0]];
            if (formatter) {
              data = formatter(points[0].point.y);
            } else {
              data = points[0].point.y.toFixed(1);
            }
          } else {
            const [median] = points;
            label = `Median ${median.series.name}`;
            data = median.point.y.toFixed(1);
          }
          const metric = new Metric(options, data);
          return `<td>
            <p style="text-transform: uppercase; font-size: 10px;">
              ${label}
            </p>
            <p style="color: ${points[0].series.color}; font-size: 20px;">
              ${metric.toString()}
            </p>
          </td>`;
        }
        const desktop = this.points.filter(o => o.series.name == 'Desktop');
        const mobile = this.points.filter(o => o.series.name == 'Mobile');
        return `${tooltip}
        <table cellpadding="5" style="text-align: center;">
          <tr>
            ${getRow(desktop)}
            ${getRow(mobile)}
          </tr>
        </table>
        ${getChangelog(changelog)}`;
      }
    },
    rangeSelector: {
      buttons: [{
        type: 'month',
        count: 1,
        text: '1m'
      }, {
        type: 'month',
        count: 3,
        text: '3m'
      }, {
        type: 'month',
        count: 6,
        text: '6m'
      }, {
        type: 'ytd',
        text: 'YTD'
      }, {
        type: 'year',
        count: 1,
        text: '1y'
      }, {
        type: 'year',
        count: 3,
        text: '3y'
      }, {
        type: 'all',
        text: 'All'
      }]
    },
    xAxis: {
      type: 'datetime',
      events: {
        setExtremes: e => redrawTimeseriesTable[options.metric]([e.min, e.max])
      },
      min: options.min,
      max: options.max
    },
    yAxis: {
      title: {
        text: `${options.name}${options.redundant ? '' : ` (${options.type})`}`
      },
      opposite: false,
      min: 0
    },
    series,
    credits: {
      text: 'highcharts.com',
      href: 'http://highcharts.com'
    },
    exporting: chartExportOptions
  });
  chart.drawBenchmark = (name, value, color) => {
    chart.yAxis[0].update({
      plotLines: [{
        value,
        color,
        dashStyle: 'dash',
        width: 2,
        label: {
          text: name
        }
      }]
    });
  };
  chart.zooming.mousewheel.enabled = false;
  window.charts = window.charts || {};
  window.charts[options.metric] = chart;
  */

  const data = [
    { year: 2010, count: 10 },
    { year: 2011, count: 20 },
    { year: 2012, count: 15 },
    { year: 2013, count: 25 },
    { year: 2014, count: 22 },
    { year: 2015, count: 30 },
    { year: 2016, count: 28 },
  ];

  console.log('Options:', options);
  console.log('Series:', series);

  // Create the DateTimeFormat instance once
  const dateFormatterShort = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
  });

  // Function to format dates
  function formatDateShort(timestamp) {
    return dateFormatterShort.format(new Date(timestamp));
  }

  // Create the DateTimeFormat instance once
  const dateFormatterLong = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Function to format dates
  function formatDateLong(timestamp) {
    return dateFormatterLong.format(new Date(timestamp));
  }

  const numberFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short', // Use 'long' for "Million", 'short' for "M"
  });

  // Function to format dates
  function formatNumber(number) {
    return numberFormatter.format(number);
  }

  const chartData = {};

  const axis = series.find((data) => data.name === 'xaxis');
  if (axis) chartData.labels = axis.data;

  chartData.datasets = [];
  const desktopLineData = series.find((data) => data.name === 'Desktop' && data.type === 'line');
  if (desktopLineData) {
    const data = {
      label: 'Desktop',
      data:  desktopLineData.data,
      backgroundColor:Colors.DESKTOP,
      borderColor: Colors.DESKTOP,
      pointStyle: false
    }

    chartData.datasets.push(data);
  }
  const mobileLineData = series.find((data) => data.name === 'Mobile' && data.type === 'line');
  if (mobileLineData) {
    const data = {
      label: 'Mobile',
      data:  mobileLineData.data,
      backgroundColor:Colors.MOBILE,
      borderColor: Colors.MOBILE,
      pointStyle: false
    }

    chartData.datasets.push(data);
  }
  const desktopRangeData = series.find((data) => data.name === 'Desktop' && data.subtype === 'areasplinerange');
  if (desktopRangeData) {
    const lowerRange = {
      label: 'DesktopLower',
      data:  desktopRangeData.data,
      backgroundColor: '#fff',
      borderColor: 'rgba(4, 199, 253, 0.1)', //opacity
      pointStyle: false,
      fill: true,
      tooltip: {
        enabled: false
      }
    }
    chartData.datasets.push(lowerRange);
    const upperRange = {
      label: 'DesktopUpper',
      data:  desktopRangeData.data.map((datapoint) => [datapoint[0], datapoint[2]]),
      backgroundColor: 'rgba(4, 199, 253, 0.1)',
      borderColor: 'rgba(4, 199, 253, 0.1)',
      pointStyle: false,
      fill: '-1',
      tooltip: {
        enabled: false,
      }
    }
    chartData.datasets.push(upperRange);
  }
  const mobileRangeData = series.find((data) => data.name === 'Mobile' && data.subtype === 'areasplinerange');
  if (mobileRangeData) {
    const lowerRange = {
      label: 'MobileLower',
      data:  mobileRangeData.data,
      backgroundColor: '#fff',
      borderColor: 'rgba(166, 42, 164, 0.1)',
      pointStyle: false,
      fill: true,
      tooltip: {
        enabled: false
      }
    }
    chartData.datasets.push(lowerRange);
    const upperRange = {
      label: 'MobileUpper',
      data:  mobileRangeData.data.map((datapoint) => [datapoint[0], datapoint[2]]),
      backgroundColor: 'rgba(166, 42, 164, 0.1)',
      borderColor: 'rgba(166, 42, 164, 0.1)',
      pointStyle: false,
      fill: '-1',
      tooltip: {
        enabled: false,
      }
    }
    chartData.datasets.push(upperRange);
  }

  const chart = new Chart(
    document.getElementById(options.chartId),
    {
      type: 'line',
      options: {
        responsive: true,
        layout: {
          padding: {
            bottom: 20,
          },
        },
        legend: {
          labels: {
            padding: {
                top: 20, // Creates a gap between the chart and the legend above it
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: options.lens ? `${options.lens.name}: ` : '' + `Timeseries of ${options.name}`,
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
            text: 'Source: httparchive.org',
            font: {
              family: 'Helvetica, Arial, sans-serif',
              size: 13,
              weight: 'normal',
            },
            padding: {
                bottom: 20,
            },
          },
          tooltip: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
            callbacks: {
              title: function (context) {
                return formatDateLong(parseInt(context[0].label));
              },
              label: function(context) {
                // Exclude range datasets from tooltip
                if (context.dataset?.tooltip?.enabled == false) {
                  return null;
                }
                return ` ${context.dataset.label}: ${context.formattedValue}`;
              },
              afterBody: function (context) {
                const date = parseInt(context[0].label);
                const matchingFlag = series.at(-1).data.find((flag) => {
                  return date === flag.x
                });

                const extraMessage = matchingFlag ? matchingFlag.title + ': ' + flags[matchingFlag.x]?.title : '';
                return `${extraMessage}`;
              },
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
              // modifierKey: 'shift',
            },
            zoom: {
              drag: {
                enabled: true, // Enable zooming with drag
                modifierKey: 'shift',
              },
              wheel: {
                enabled: false, // Enable zooming with the mouse wheel
              },
              pinch: {
                enabled: false, // Enable zooming with touch gestures
              },
              mode: 'x', // Zoom in the X-axis only
            },
          },
        },
        scales: {
          x: {
            grid: {
              drawOnChartArea: false,
              drawTicks: true,
            },
            min: series.find((data) => data.name === 'Desktop' && data.type === 'line').data.length - 88,
            max: series.find((data) => data.name === 'Desktop' && data.type === 'line').data.length - 1,
            ticks: {
              // autoSkip: false,
              maxRotation: 0, // Prevent rotation
              minRotation: 0, // Prevent rotation
              length: 10, // Length of the tick lines (in pixels,
              callback: function (value, index, ticks) {
                return formatDateShort(this.getLabelForValue(value));
              }
            },
            padding: {
              bottom: 80,
            },
          },
          y: {
            grid: {
              drawBorder: false,
            },
            ticks: {
              callback: function (value) {
                return formatNumber(value);
              },
            },
          }
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
          id: 'extraLabelsPlugin',
          afterDraw(chart) {
              const { ctx, chartArea: { left, right, bottom }, scales: { x } } = chart;
              // Store stacked labels for each visible tick
              const stackedLabels = {};

              ctx.save();
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillStyle = 'black';

              for (const flagLabel of Object.entries(series.at(-1).data)) {
                const timestamp = flagLabel[1].x;
                const label = flagLabel[1].title;
                let nearestTickIndex = null;
                let nearestDistance = Infinity;

                if (timestamp < chart.data.labels[x.ticks[0].value] || timestamp > chart.data.labels[x.ticks.at(-1).value]) {
                  continue;
                }

                // Find the nearest visible tick
                x.ticks.forEach((tick, index) => {
                    const tickDate = chart.data.labels[tick.value];
                    const distance = Math.abs(timestamp - tickDate);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestTickIndex = index;
                    }
                });

                if (nearestTickIndex !== null) {
                  const tickValue = x.ticks[nearestTickIndex].value;
                  if (!stackedLabels[tickValue]) {
                      stackedLabels[tickValue] = [];
                  }
                  stackedLabels[tickValue].push(label);
                }

                // Draw stacked labels for each tick
                x.ticks.forEach((tick, index) => {
                  const tickValue = tick.value;
                  const labels = stackedLabels[tickValue];

                  if (labels) {
                    const xPosition = x.getPixelForTick(index);
                    labels.forEach((label, labelIndex) => {
                      const xPositionAdjusted = xPosition + labelIndex * 15;
                      const yPosition = bottom + 40;
                      ctx.fillText(label, xPositionAdjusted, yPosition);
                    });
                  }
                });
              }

              ctx.restore();
          }
        }
      ],
      data: chartData,
    }
  );



  const setZoom = (range) => {
    const xScale = chart.scales.x;
    const now = new Date();

    const dataLabels = chart.data.labels;
    let start, end = Math.max(...dataLabels);
    let endDate = new Date(end);

    switch (range) {
        case 'ytd':
            start = new Date(endDate.getFullYear(), 0, 1).getTime();
            break;
        case '1y':
            start = new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1).getTime();
            break;
        case '3y':
            start = new Date(endDate.getFullYear() - 3, endDate.getMonth(), 1).getTime();
            break;
        case '5y':
            start = new Date(endDate.getFullYear() - 5, endDate.getMonth(), 1).getTime();
            break;
        case '10y':
            start = new Date(endDate.getFullYear() - 10, endDate.getMonth(), 1).getTime();
            break;
        case 'all':
            start = Math.min(...dataLabels);
            break;
    }
    // Programmatically zoom to the specified range
    chart.zoomScale('x', { min: start, max: end });
  };

  // Zoom button functionality
  document.getElementById(`${options.chartId}-ytd-zoom`).addEventListener('click', () => {
    setZoom("ytd");
  });

  document.getElementById(`${options.chartId}-1y-zoom`).addEventListener('click', () => {
    setZoom("1y");
  });

  document.getElementById(`${options.chartId}-3y-zoom`).addEventListener('click', () => {
    setZoom("3y");
  });

  document.getElementById(`${options.chartId}-5y-zoom`).addEventListener('click', () => {
    setZoom("5y");
  });

  document.getElementById(`${options.chartId}-5y-zoom`).addEventListener('click', () => {
    setZoom("10y");
  });

  document.getElementById(`${options.chartId}-all-zoom`).addEventListener('click', () => {
    setZoom("all");
  });


    // Custom scroll bar logic
  const scrollBar = document.getElementById(`${options.chartId}-scrollBar`);

  // Adjust scroll bar range dynamically
  scrollBar.max = series[1].data.length - 96;
  scrollBar.value = series[1].data.length - 96; // Number of labels - initially visible range (20)

  scrollBar.addEventListener('input', (e) => {
      const start = parseInt(e.target.value);
      chart.options.scales.x.min = start;
      chart.options.scales.x.max = start + 96; // Maintain a fixed visible range
      chart.update();
  });
}

const DEFAULT_FIELDS = ['p10', 'p25', 'p50', 'p75', 'p90'];
const DEFAULT_COLS = ['date', 'client'];
const toFixed = value => parseFloat(value).toFixed(1);
const formatters = {
  date: prettyDate,
  p10: toFixed,
  p25: toFixed,
  p50: toFixed,
  p75: toFixed,
  p90: toFixed,
  percent: toFixed,
  urls: value => parseInt(value).toLocaleString()
};

const zip = data => {
  const dates = {};
  data.forEach(o => {
    let row = dates[o.timestamp];
    if (row) {
      row.push(o);
      row.sort((a, b) => a.client == 'desktop' ? -1 : 1)
      return;
    }
    dates[o.timestamp] = [o];
  });
  return Object.entries(dates).sort(([a], [b]) => a > b ? -1 : 1);
};

const toRow = (o, i, n, cols) => {
  const row = el('tr');
  cols.map(col => {
    const td = el('td');
    let text = o[col];
    const formatter = formatters[col];
    if (formatter) {
      text = formatter(o[col]);
    }
    td.textContent = text;
    return td;
  }).forEach(td => td && row.appendChild(td));
  return row;
};

// Export directly to global scope for use by Jinja template.
window.timeseries = timeseries;
