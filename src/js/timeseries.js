import * as echarts from 'echarts';
import Changelog from './changelog';
import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, prettyDate, drawMetricSummary, callOnceWhenVisible } from './utils';
import { Constants } from './techreport/utils/constants.js';

const DEFAULT_COLS = ['Date'];
const DEFAULT_FIELDS = ['Desktop', 'Mobile'];

// Standard SI unit formatting for Y-axis (10M, 1.5M, 200k, etc.)
function formatSI(val) {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1e9) return (val / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (val / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (val / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  if (abs < 0.01) return val.toFixed(3);
  return val.toLocaleString();
}

function getQueryUrl(metric, type = 'timeseries') {
  return `https://github.com/HTTPArchive/legacy.httparchive.org/blob/master/sql/${type}/${metric}.sql`;
}

function timeseries(metric, options, start, end) {
  const dataUrl = `${Constants.apiBase}/static/reports/${options.lens ? `${options.lens.id}/` : ''}${metric}.json`;
  options.chartId = `${metric}-chart`;
  options.tableId = `${metric}-table`;
  options.metric = metric;

  fetch(dataUrl)
    .then(response => response.text())
    .then(jsonStr => JSON.parse(jsonStr))
    .then(data => data.sort((a, b) => (a.date < b.date ? -1 : 1)))
    .then(data => {
      let [YYYY, MM, DD] = start.split('_');
      options.min = Date.UTC(YYYY, MM - 1, DD);
      [YYYY, MM, DD] = end.split('_');
      options.max = Date.UTC(YYYY, MM - 1, DD);

      // Ensure null values are filtered out
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
  if (!data.length) return;

  const value = getSummary(data, options);
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
  if (data.length < 2) return;

  let oldestIndex;
  for (let i = 0; i < data.length; i++) {
    if (getPrimaryMetric(data[i], options) > 0) {
      oldestIndex = i;
      break;
    }
  }

  if (oldestIndex === undefined) return;

  const oldest = getPrimaryMetric(data[oldestIndex], options);
  const latest = getPrimaryMetric(data[data.length - 1], options);
  return ((latest - oldest) * 100) / oldest;
}

function getPrimaryMetric(o, options) {
  const field = getPrimaryFieldName(o, options);
  const primaryMetric = getUnformattedPrimaryMetric(o, options);
  const formatter = formatters[field];
  if (formatter) return formatter(primaryMetric);
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

const flags = {};
let changelogPromise = null;
const loadChangelog = () => {
  if (!changelogPromise) {
    changelogPromise = fetch(Changelog.URL)
      .then(response => response.json())
      .catch(() => []);
  }
  return changelogPromise;
};

function drawTimeseries(data, options) {
  data = data.map(toNumeric);
  const desktop = data.filter(isDesktop);
  const mobile = data.filter(isMobile);

  loadChangelog().then(changelogData => {
    changelogData.forEach(change => {
      flags[+change.date] = {
        title: change.title,
        desc: change.desc
      };
    });

    const activeChanges = changelogData.filter(o => o.displayInTimeSeries !== false);
    const container = document.getElementById(options.chartId);
    if (!container) return;

    callOnceWhenVisible(container, () => {
      renderEChartsTimeseries(container, desktop, mobile, activeChanges, options, data);
    });
  });
}

function renderEChartsTimeseries(container, desktop, mobile, changelogData, options, allData) {
  container.innerHTML = '';

  const chartTitle = `${options.lens ? `${options.lens.name}: ` : ''}Timeseries of ${options.name}`;

  // 1. Header Card Element
  const header = document.createElement('div');
  header.className = 'chart-header';
  header.innerHTML = `
    <h3 class="chart-title">${chartTitle}</h3>
    <div class="chart-subtitle">Source: <a href="https://httparchive.org" target="_blank" rel="noopener">httparchive.org</a></div>
    <div class="chart-menu">
      <button class="chart-menu-btn" title="Chart options" aria-label="Chart options">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div class="chart-menu-dropdown hidden">
        <button class="chart-menu-item" data-action="download-png">Download PNG image</button>
        <button class="chart-menu-item" data-action="download-svg">Download SVG vector image</button>
        <button class="chart-menu-item" data-action="show-query">Show BigQuery query</button>
      </div>
    </div>
  `;
  container.appendChild(header);

  // 2. Navigation Bar Element (Zoom Presets & Range Indicator)
  const navBar = document.createElement('div');
  navBar.className = 'chart-nav-bar';
  navBar.innerHTML = `
    <div class="chart-zoom-group">
      <span class="zoom-label">Zoom</span>
      <button class="zoom-btn" data-range="1m">1m</button>
      <button class="zoom-btn" data-range="3m">3m</button>
      <button class="zoom-btn" data-range="6m">6m</button>
      <button class="zoom-btn" data-range="YTD">YTD</button>
      <button class="zoom-btn" data-range="1y">1y</button>
      <button class="zoom-btn" data-range="3y">3y</button>
      <button class="zoom-btn active" data-range="All">All</button>
    </div>
    <span class="chart-range-display"></span>
  `;
  container.appendChild(navBar);

  // 3. ECharts Main Plot Host
  const mainPlotEl = document.createElement('div');
  mainPlotEl.className = 'chart-main-plot';
  container.appendChild(mainPlotEl);

  // Calculate full data boundaries and unique crawl timestamps
  const allTimestamps = Array.from(new Set([...desktop, ...mobile].map(d => d.timestamp).filter(Boolean))).sort((a, b) => a - b);
  const earliest = Math.min(...allTimestamps);
  const latest = Math.max(...allTimestamps);

  const initialMin = options.min || earliest;
  const initialMax = options.max || latest;

  // Initialize ECharts instance with SVG renderer for vector clarity
  const chart = echarts.init(mainPlotEl, null, {
    renderer: 'svg'
  });

  // Build high-fidelity changelog mapping
  // Map by:
  // 1. Exact changelog date timestamp
  // 2. UTC midnight of changelog date
  // 3. Closest crawl timestamp in the dataset
  const changelogMap = new Map();

  // Filter changelog items to only those within the metric's lifespan
  // so obsolete milestones (e.g. from 2012-2018 on a 2020+ metric) aren't processed
  const relevantChanges = changelogData.filter(c => {
    const ts = +c.date;
    return ts >= earliest - 15 * 86400000 && ts <= latest + 15 * 86400000;
  });

  const changelogSeriesData = relevantChanges.map(c => {
    // Preserve canonical global letter matching HTTPArchive standard
    const globalIdx = changelogData.findIndex(x => x.date === c.date);
    const letter = String.fromCharCode(65 + ((globalIdx >= 0 ? globalIdx : 0) % 26));
    const item = {
      ...c,
      letter,
      title: c.title,
      desc: c.desc
    };

    // 1. Exact date
    changelogMap.set(+c.date, item);

    // 2. UTC midnight
    const cd = new Date(+c.date);
    const midnight = Date.UTC(cd.getUTCFullYear(), cd.getUTCMonth(), cd.getUTCDate());
    changelogMap.set(midnight, item);

    // 3. Closest crawl timestamp
    let closestTs = allTimestamps[0];
    let minDiff = Infinity;
    for (const ts of allTimestamps) {
      const diff = Math.abs(ts - c.date);
      if (diff < minDiff) {
        minDiff = diff;
        closestTs = ts;
      }
    }
    if (minDiff <= 15 * 86400000) {
      changelogMap.set(closestTs, item);
      item.crawlTs = closestTs;
    } else {
      item.crawlTs = midnight;
    }

    return [item.crawlTs, 0, letter, item.title, item];
  });

  // Dynamic benchmarks
  const benchmarkMarkLines = [];

  // Build Series
  const seriesList = [];
  const legendNames = [];
  const hasCustomFields = !!(options.timeseries && options.timeseries.fields);

  if (desktop.length) {
    if (hasCustomFields) {
      options.timeseries.fields.forEach(field => {
        const name = options.timeseries.fields.length === 1 ? 'Desktop' : `Desktop ${field}`;
        legendNames.push(name);
        seriesList.push({
          name,
          type: 'line',
          data: desktop.map(o => [o.timestamp, o[field]]),
          showSymbol: false,
          smooth: false,
          lineStyle: { color: Colors.DESKTOP, width: 2 },
          itemStyle: { color: Colors.DESKTOP },
          markLine: field === options.timeseries.fields[0] && benchmarkMarkLines.length ? {
            symbol: ['none', 'none'],
            silent: true,
            data: benchmarkMarkLines
          } : undefined
        });
      });
    } else {
      legendNames.push('Desktop');

      // Desktop IQR Lower Base (transparent, stacked)
      seriesList.push({
        name: 'Desktop IQR Base',
        type: 'line',
        data: desktop.map(o => [o.timestamp, o.p25]),
        stack: 'desktop-iqr',
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        symbol: 'none',
        showSymbol: false,
        silent: true,
        tooltip: { show: false }
      });

      // Desktop IQR Span (p75 - p25, shaded)
      seriesList.push({
        name: 'Desktop IQR',
        type: 'line',
        data: desktop.map(o => [o.timestamp, Math.max(0, o.p75 - o.p25)]),
        stack: 'desktop-iqr',
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(4, 199, 253, 0.15)', opacity: 1 },
        symbol: 'none',
        showSymbol: false,
        silent: true,
        tooltip: { show: false }
      });

      // Desktop Median Line (p50)
      seriesList.push({
        name: 'Desktop',
        type: 'line',
        data: desktop.map(o => [o.timestamp, o.p50]),
        lineStyle: { color: Colors.DESKTOP, width: 2 },
        itemStyle: { color: Colors.DESKTOP },
        showSymbol: false,
        smooth: false,
        z: 3,
        markLine: benchmarkMarkLines.length ? {
          symbol: ['none', 'none'],
          silent: true,
          data: benchmarkMarkLines
        } : undefined
      });
    }
  }

  if (mobile.length) {
    if (hasCustomFields) {
      options.timeseries.fields.forEach(field => {
        const name = options.timeseries.fields.length === 1 ? 'Mobile' : `Mobile ${field}`;
        legendNames.push(name);
        seriesList.push({
          name,
          type: 'line',
          data: mobile.map(o => [o.timestamp, o[field]]),
          showSymbol: false,
          smooth: false,
          lineStyle: { color: Colors.MOBILE, width: 2 },
          itemStyle: { color: Colors.MOBILE }
        });
      });
    } else {
      legendNames.push('Mobile');

      // Mobile IQR Lower Base
      seriesList.push({
        name: 'Mobile IQR Base',
        type: 'line',
        data: mobile.map(o => [o.timestamp, o.p25]),
        stack: 'mobile-iqr',
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        symbol: 'none',
        showSymbol: false,
        silent: true,
        tooltip: { show: false }
      });

      // Mobile IQR Span (p75 - p25)
      seriesList.push({
        name: 'Mobile IQR',
        type: 'line',
        data: mobile.map(o => [o.timestamp, Math.max(0, o.p75 - o.p25)]),
        stack: 'mobile-iqr',
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(182, 24, 119, 0.15)', opacity: 1 },
        symbol: 'none',
        showSymbol: false,
        silent: true,
        tooltip: { show: false }
      });

      // Mobile Median Line (p50)
      seriesList.push({
        name: 'Mobile',
        type: 'line',
        data: mobile.map(o => [o.timestamp, o.p50]),
        lineStyle: { color: Colors.MOBILE, width: 2 },
        itemStyle: { color: Colors.MOBILE },
        showSymbol: false,
        smooth: false,
        z: 3
      });
    }
  }

  // Append Changelog custom series (Option A: Clean bottom axis pins, on-demand crosshair)
  if (changelogSeriesData.length) {
    seriesList.push({
      name: 'Changelog',
      type: 'custom',
      coordinateSystem: 'cartesian2d',
      xAxisIndex: 0,
      yAxisIndex: 0,
      z: 10,
      data: changelogSeriesData,
      renderItem: (params, api) => {
        const ts = api.value(0);
        const letter = api.value(2);
        const coord = api.coord([ts, 0]);
        const x = coord[0];
        const gridBottom = params.coordSys.y + params.coordSys.height;

        // Clip if outside visible chart bounds
        if (x < params.coordSys.x - 12 || x > params.coordSys.x + params.coordSys.width + 12) {
          return;
        }

        const dataIdx = params.dataIndex;
        let stemH = 14;
        const boxW = 16;
        const boxH = 16;

        // Dynamic stem staggering when adjacent milestones are close in pixels (< 18px)
        if (dataIdx > 0) {
          const prevTs = changelogSeriesData[dataIdx - 1][0];
          const prevX = api.coord([prevTs, 0])[0];
          if (Math.abs(x - prevX) < 18) {
            stemH = (dataIdx % 2 === 1) ? 28 : 14;
          }
        }

        const boxY = gridBottom - stemH - boxH;
        const boxX = Math.round(x - boxW / 2);

        return {
          type: 'group',
          children: [
            // Stem connecting tick to flag
            {
              type: 'line',
              shape: {
                x1: Math.round(x),
                y1: gridBottom,
                x2: Math.round(x),
                y2: boxY + boxH
              },
              style: {
                stroke: '#94a3b8',
                lineWidth: 1
              }
            },
            // Flag badge box
            {
              type: 'rect',
              shape: {
                x: boxX,
                y: boxY,
                width: boxW,
                height: boxH,
                r: 3
              },
              style: {
                fill: '#ffffff',
                stroke: '#94a3b8',
                lineWidth: 1,
                shadowColor: 'rgba(0, 0, 0, 0.08)',
                shadowBlur: 2
              },
              emphasis: {
                style: {
                  fill: '#f0f9ff',
                  stroke: '#0284c7',
                  lineWidth: 1.5,
                  shadowColor: 'rgba(2, 132, 199, 0.25)',
                  shadowBlur: 4
                }
              }
            },
            // Letter text
            {
              type: 'text',
              style: {
                text: letter,
                x: Math.round(x),
                y: boxY + Math.round(boxH / 2) + 1,
                fill: '#475569',
                font: 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                textAlign: 'center',
                textVerticalAlign: 'middle'
              },
              emphasis: {
                style: {
                  fill: '#0284c7'
                }
              }
            }
          ]
        };
      }
    });
  }

  const yAxisTitle = `${options.name}${options.redundant ? '' : ` (${options.type})`}`;

  // ECharts Option Configuration
  const option = {
    animation: false,
    grid: {
      top: 25,
      left: 70,
      right: 25,
      bottom: 95,
      containLabel: false
    },
    legend: {
      bottom: 4,
      left: 'center',
      data: legendNames,
      icon: 'roundRect',
      itemWidth: 16,
      itemHeight: 4,
      textStyle: {
        color: '#374151',
        fontSize: 12
      }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#d1d5db',
      borderWidth: 1,
      padding: 10,
      extraCssText: 'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14); border-radius: 6px; backdrop-filter: blur(4px);',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#94a3b8',
          type: 'dashed',
          width: 1
        }
      },
      formatter: params => {
        if (!params || !params.length) return '';
        const visibleParams = params.filter(p => !p.seriesName.includes('IQR') && p.seriesName !== 'Changelog');
        if (!visibleParams.length) {
          const changelogParam = params.find(p => p.seriesName === 'Changelog');
          if (changelogParam) {
            const ts = changelogParam.value[0];
            const d = new Date(ts);
            const formattedDate = ts >= Date.UTC(2019, 0, 1)
              ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
              : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            const title = changelogParam.value[3];
            return `
              <div class="echarts-tooltip-card" style="max-width: 320px;">
                <div class="tooltip-date">${formattedDate}</div>
                <div class="changelog-box" style="margin-top: 6px; font-size: 11px; text-align: left; max-width: 290px; white-space: normal; line-height: 1.4;">
                  <span style="font-weight: 600; color: #1f2937;">${title}</span>
                </div>
              </div>
            `;
          }
          return '';
        }

        const ts = visibleParams[0].value[0];
        const d = new Date(ts);
        const formattedDate = ts >= Date.UTC(2019, 0, 1)
          ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

        let html = `<div class="echarts-tooltip-card" style="max-width: 320px;">`;
        html += `<div class="tooltip-date">${formattedDate}</div>`;
        html += `<table><tr>`;

        visibleParams.forEach(p => {
          const val = p.value[1];
          const color = p.color;
          const label = p.seriesName;
          let formattedVal = '-';
          if (val !== undefined && val !== null) {
            if (options.timeseries && options.timeseries.fields) {
              const fmt = formatters[options.timeseries.fields[0]];
              formattedVal = fmt ? fmt(val) : val.toFixed(1);
            } else {
              formattedVal = val.toFixed(1);
            }
          }

          html += `<td>
            <div class="series-label" style="color: ${color};">${label}</div>
            <div class="series-val" style="color: ${color};">${formattedVal}</div>
          </td>`;
        });

        html += `</tr></table>`;

        // Check for changelog milestone
        const cd = new Date(ts);
        const midnight = Date.UTC(cd.getUTCFullYear(), cd.getUTCMonth(), cd.getUTCDate());
        const changelogItem = changelogMap.get(ts) || changelogMap.get(midnight);
        if (changelogItem) {
          html += `
            <div class="changelog-box" style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: left; max-width: 290px; white-space: normal; line-height: 1.4;">
              <span style="font-weight: 600; color: #1f2937;">${changelogItem.title}</span>
            </div>
          `;
        }

        html += `</div>`;
        return html;
      }
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 11
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#f1f5f9', type: 'solid' }
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisTitle,
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 50,
      nameTextStyle: {
        color: '#64748b',
        fontSize: 12
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        formatter: val => formatSI(val)
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#f1f5f9' }
      }
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        startValue: initialMin,
        endValue: initialMax,
        left: 70,
        right: 25,
        bottom: 34,
        height: 26,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        fillerColor: 'rgba(4, 199, 253, 0.12)',
        handleIcon: 'path://M-9.35,34.56V42m0-40V9.5m-2,0h4a2,2,0,0,1,2,2v21a2,2,0,0,1-2,2h-4a2,2,0,0,1-2-2v-21A2,2,0,0,1-11.35,9.5Z',
        handleSize: '100%',
        handleStyle: {
          color: '#ffffff',
          borderColor: '#0284c7',
          borderWidth: 1.5,
          shadowBlur: 2,
          shadowColor: 'rgba(0,0,0,0.1)'
        },
        moveHandleSize: 6,
        moveHandleStyle: { color: '#0284c7', opacity: 0.6 },
        showDetail: false,
        dataBackground: {
          lineStyle: { color: '#04c7fd', width: 1 },
          areaStyle: { color: 'rgba(4, 199, 253, 0.08)' }
        },
        selectedDataBackground: {
          lineStyle: { color: '#0284c7', width: 1.5 },
          areaStyle: { color: 'rgba(4, 199, 253, 0.2)' }
        }
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false
      }
    ],
    series: seriesList
  };

  chart.setOption(option);

  // Year labels overlay inside the zoom/pan slider
  const sliderYearsEl = document.createElement('div');
  sliderYearsEl.className = 'chart-slider-years';
  sliderYearsEl.style.cssText = 'position: absolute; left: 70px; right: 25px; bottom: 34px; height: 26px; pointer-events: none; overflow: hidden; display: flex; align-items: center; z-index: 2;';

  const startYr = new Date(earliest).getUTCFullYear();
  const endYr = new Date(latest).getUTCFullYear();
  const yrSpan = endYr - startYr;
  const step = yrSpan > 10 ? 4 : (yrSpan > 5 ? 2 : 1);
  const firstYr = yrSpan > 10 ? 2014 : Math.ceil((startYr + 1) / step) * step;

  for (let yr = firstYr; yr < endYr; yr += step) {
    const yrTs = Date.UTC(yr, 0, 1);
    const pct = ((yrTs - earliest) / (latest - earliest)) * 100;
    if (pct >= 8 && pct <= 92) {
      const span = document.createElement('span');
      span.style.cssText = `position: absolute; left: ${pct}%; font-size: 11px; color: #475569; font-weight: 600; transform: translateX(-50%); user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-shadow: 0 0 4px #ffffff, 0 0 2px #ffffff;`;
      span.textContent = yr.toString();
      sliderYearsEl.appendChild(span);
    }
  }
  mainPlotEl.appendChild(sliderYearsEl);

  // Link IQR series with legend toggling
  chart.on('legendselectchanged', params => {
    const isSelected = params.selected[params.name];
    const updateSelected = { ...params.selected };

    if (params.name === 'Desktop') {
      updateSelected['Desktop IQR Base'] = isSelected;
      updateSelected['Desktop IQR'] = isSelected;
    } else if (params.name === 'Mobile') {
      updateSelected['Mobile IQR Base'] = isSelected;
      updateSelected['Mobile IQR'] = isSelected;
    }

    chart.setOption({
      legend: { selected: updateSelected }
    });
  });

  // Range Display element & Sync
  const rangeDisplay = navBar.querySelector('.chart-range-display');
  const zoomBtns = navBar.querySelectorAll('.zoom-btn');

  function updateRangeDisplay(minT, maxT) {
    const fmt = ts => {
      const d = new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    };
    if (rangeDisplay) {
      rangeDisplay.textContent = `${fmt(minT)} → ${fmt(maxT)}`;
    }
  }

  function syncZoomButtonState(minT, maxT) {
    const span = maxT - minT;
    const totalSpan = latest - earliest;
    const yearMs = 365.25 * 86400000;
    const monthMs = 30.5 * 86400000;

    zoomBtns.forEach(btn => btn.classList.remove('active'));

    const tolerance = 0.15;
    if (span >= totalSpan * (1 - tolerance)) {
      navBar.querySelector('[data-range="All"]')?.classList.add('active');
    } else if (Math.abs(span - 3 * yearMs) / (3 * yearMs) < tolerance) {
      navBar.querySelector('[data-range="3y"]')?.classList.add('active');
    } else if (Math.abs(span - yearMs) / yearMs < tolerance) {
      navBar.querySelector('[data-range="1y"]')?.classList.add('active');
    } else if (Math.abs(span - 6 * monthMs) / (6 * monthMs) < tolerance) {
      navBar.querySelector('[data-range="6m"]')?.classList.add('active');
    } else if (Math.abs(span - 3 * monthMs) / (3 * monthMs) < tolerance) {
      navBar.querySelector('[data-range="3m"]')?.classList.add('active');
    } else if (Math.abs(span - monthMs) / monthMs < tolerance) {
      navBar.querySelector('[data-range="1m"]')?.classList.add('active');
    }
  }

  updateRangeDisplay(initialMin, initialMax);
  syncZoomButtonState(initialMin, initialMax);

  // Debounced table sync
  const debouncedTableSync = debounce((minT, maxT) => {
    drawTimeseriesTable(allData, options, [minT, maxT]);
  }, 100);

  // Listen to ECharts DataZoom events (fired by slider drag, wheel zoom, pan)
  chart.on('dataZoom', () => {
    const axis = chart.getModel()?.getComponent('xAxis', 0)?.axis;
    if (!axis) return;
    const extent = axis.scale.getExtent();
    const curMin = extent[0];
    const curMax = extent[1];

    updateRangeDisplay(curMin, curMax);
    syncZoomButtonState(curMin, curMax);
    debouncedTableSync(curMin, curMax);
  });

  // Range button handlers
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      let newMin = earliest;
      const endTs = latest;

      const yearMs = 365.25 * 86400000;
      const monthMs = 30.5 * 86400000;

      if (range === '1m') newMin = endTs - monthMs;
      else if (range === '3m') newMin = endTs - 3 * monthMs;
      else if (range === '6m') newMin = endTs - 6 * monthMs;
      else if (range === 'YTD') {
        const yr = new Date(endTs).getUTCFullYear();
        newMin = Date.UTC(yr, 0, 1);
      } else if (range === '1y') newMin = endTs - yearMs;
      else if (range === '3y') newMin = endTs - 3 * yearMs;
      else if (range === 'All') newMin = earliest;

      newMin = Math.max(earliest, newMin);

      zoomBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      chart.dispatchAction({
        type: 'dataZoom',
        startValue: newMin,
        endValue: endTs
      });

      updateRangeDisplay(newMin, endTs);
      debouncedTableSync(newMin, endTs);
    });
  });

  // Context menu toggle
  const menuBtn = header.querySelector('.chart-menu-btn');
  const dropdown = header.querySelector('.chart-menu-dropdown');

  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    dropdown?.classList.toggle('hidden');
    menuBtn.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    dropdown?.classList.add('hidden');
    menuBtn?.classList.remove('active');
  });

  // Context menu action exports
  dropdown?.querySelectorAll('.chart-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      dropdown.classList.add('hidden');
      menuBtn?.classList.remove('active');

      if (action === 'download-png') {
        exportECharts(chart, mainPlotEl, `${options.metric}-timeseries`, 'png');
      } else if (action === 'download-svg') {
        exportECharts(chart, mainPlotEl, `${options.metric}-timeseries`, 'svg');
      } else if (action === 'show-query') {
        const url = getQueryUrl(options.metric, 'timeseries');
        if (url) window.open(url, '_blank');
      }
    });
  });

  // Responsive window resize
  const onResize = debounce(() => {
    chart.resize();
  }, 100);
  window.addEventListener('resize', onResize);

  // Return chart controller for external benchmarks
  const chartController = {
    drawBenchmark: (name, value, color) => {
      benchmarkMarkLines.push({
        yAxis: value,
        name,
        lineStyle: { color: color || '#94a3b8', type: 'dashed' },
        label: { formatter: name, position: 'insideEndTop' }
      });
      // Re-apply benchmark markLines
      if (seriesList.length) {
        seriesList[0].markLine = {
          symbol: ['none', 'none'],
          silent: true,
          data: benchmarkMarkLines
        };
        chart.setOption({ series: seriesList });
      }
    }
  };

  return chartController;
}

// Export high-resolution PNG or vector SVG
function exportECharts(chart, container, filename, format) {
  if (format === 'svg') {
    const svgEl = container.querySelector('svg');
    if (!svgEl) {
      alert('SVG export is only available in vector mode.');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (format === 'png') {
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const bbox = svgEl.getBoundingClientRect();
    const scale = 2;
    canvas.width = (bbox.width || 800) * scale;
    canvas.height = (bbox.height || 450) * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, bbox.width || 800, bbox.height || 450);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${filename}.png`;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }
}

let redrawTimeseriesTable = {};
function drawTimeseriesTable(data, options, [start, end] = [-Infinity, Infinity]) {
  start = Math.floor(start);
  end = Math.floor(end);
  if (!redrawTimeseriesTable[options.metric]) {
    redrawTimeseriesTable[options.metric] = debounce(dateRange => {
      return drawTimeseriesTable(data, options, dateRange);
    }, 100);
  }

  drawSummary(data, options, start, end);

  let cols = DEFAULT_COLS.concat(DEFAULT_FIELDS);
  if (options.timeseries && options.timeseries.fields) {
    cols = DEFAULT_COLS.concat(options.timeseries.fields);
  }

  Promise.resolve(zip(data)).then(groupedData => {
    const table = document.getElementById(options.tableId);
    if (!table) return;
    Array.from(table.children).forEach(child => table.removeChild(child));

    const frag = document.createDocumentFragment();
    const thead = el('thead');

    if (!options.timeseries || !options.timeseries.fields) {
      const trMeta = el('tr');
      trMeta.classList.add('meta-row');
      DEFAULT_COLS.forEach(() => trMeta.appendChild(el('td')));
      const th = el('th');
      th.classList.add('text-center');
      th.setAttribute('colspan', (cols.length - DEFAULT_COLS.length).toString());
      th.textContent = 'Percentile' + (th.getAttribute('colspan') === '1' ? '' : 's');
      trMeta.appendChild(th);
      thead.appendChild(trMeta);
    }

    const tr = el('tr');
    cols.forEach(col => {
      const th = el('th');
      th.textContent = col;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    frag.appendChild(thead);

    const tbody = el('tbody');
    groupedData.forEach(([date, arr]) => {
      if (date < start || date > end) return;
      arr.forEach((o, i) => tbody.appendChild(toRow(o, i, arr.length, cols)));
    });
    frag.appendChild(tbody);
    table.appendChild(frag);
  });
}

const isDesktop = o => o.client == 'desktop';
const isMobile = o => o.client == 'mobile';
const toNumeric = ({ client, ...other }) => {
  return Object.entries(other).reduce(
    (o, [k, v]) => {
      o[k] = +v;
      return o;
    },
    { client }
  );
};

const toFixed = value => (value ? (+value).toFixed(1) : value);

const formatters = {
  p10: toFixed,
  p25: toFixed,
  p50: toFixed,
  p75: toFixed,
  p90: toFixed,
  percent: toFixed,
  urls: value => parseInt(value, 10).toLocaleString()
};

const zip = data => {
  const dates = {};
  data.forEach(o => {
    const arr = dates[o.date] || [];
    arr.push(o);
    dates[o.date] = arr;
  });
  return Object.entries(dates);
};

const toRow = (o, i, n, cols) => {
  const row = el('tr');
  if (i === 0) {
    const td = el('td');
    td.setAttribute('rowspan', n.toString());
    td.textContent = prettyDate(o.date);
    row.appendChild(td);
  }

  cols.slice(1).forEach(col => {
    const td = el('td');
    td.textContent = (formatters[col] || (v => v))(o[col]);
    row.appendChild(td);
  });

  return row;
};

// Export directly to global scope
window.echarts = echarts;
window.timeseries = timeseries;
export default timeseries;
