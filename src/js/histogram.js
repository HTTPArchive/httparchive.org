import * as echarts from 'echarts';
import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, prettyDate, drawMetricSummary, callOnceWhenVisible } from './utils';
import { Constants } from './techreport/utils/constants.js';

function getQueryUrl(metric, type = 'histogram') {
  return `https://github.com/HTTPArchive/legacy.httparchive.org/blob/master/sql/${type}/${metric}.sql`;
}

function histogram(metric, date, options) {
  options.date = date;
  options.metric = metric;
  const dataUrl = `${Constants.apiBase}/static/reports/${options.lens ? `${options.lens.id}/` : ''}${date}/${metric}.json`;

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
    })
    .catch(e => {
      const chart = document.getElementById(`${metric}-chart`);
      if (chart) {
        chart.textContent = `Error loading data: ${e}. Try a more recent start date.`;
      }
    });
}

function drawClientSummary(data, options, client) {
  if (!data.length) return;
  const value = getSummary(data, options);
  drawMetricSummary(options, client, value);
}

function getSummary(data, options) {
  const summary = getPrimaryMetric(data);
  const metric = new Metric(options, summary);
  return metric.toString();
}

function getPrimaryMetric(data) {
  const filtered = data.filter(o => +o.cdf > 0.5);
  if (!filtered.length) return '?';
  return filtered[0].bin;
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
    return [this.bin, Math.round(this.pdf * 10000) / 100];
  }

  toCdfPoint() {
    return [this.bin, Math.round(this.cdf * 10000) / 100];
  }

  toRow(maxPdf) {
    const tr = document.createElement('tr');
    this.getSchema().forEach(col => {
      const td = document.createElement('td');
      if (col === 'volume') {
        const bar = document.createElement('div');
        bar.style.width = `${(this.pdf * 100) / maxPdf}%`;
        bar.classList.add(this.client);
        td.appendChild(bar);
        const text = document.createElement('span');
        text.textContent = this.format(col);
        td.appendChild(text);
      } else {
        td.textContent = this.format(col);
      }
      td.classList.add(col);
      tr.appendChild(td);
    });
    return tr;
  }

  format(property) {
    switch (property) {
      case 'pdf':
      case 'cdf': {
        let value = (Math.floor(this[property] * 10000) / 100).toFixed(2);
        if (value < 10) value = '0' + value;
        return value + '%';
      }
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
    if (!this.table) return;
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
function drawHistogramTable(data, desktopId, mobileId, type, [start, end] = [-Infinity, Infinity]) {
  if (!redrawHistogramTable) {
    redrawHistogramTable = debounce(range => {
      return drawHistogramTable(data, desktopId, mobileId, type, range);
    }, 100);
  }

  const bins = data
    .filter(d => d.bin >= start && d.bin <= end)
    .map(d => new Bin(d));

  const desktop = bins.filter(d => d.client === 'desktop');
  const mobile = bins.filter(d => d.client === 'mobile');

  if (desktop.length) new HistogramTable(desktopId, desktop, type).draw();
  if (mobile.length) new HistogramTable(mobileId, mobile, type).draw();
}

function drawHistogram(data, containerId, options) {
  const OUTLIER_MIN = 30;
  const parsedBins = data.map(d => new Bin(d));

  let desktop = parsedBins.filter(({ client }) => client === 'desktop');
  let mobile = parsedBins.filter(({ client }) => client === 'mobile');

  const max = Math.max(
    OUTLIER_MIN,
    desktop.filter(c => c.cdf < 0.95).length,
    mobile.filter(c => c.cdf < 0.95).length
  );

  desktop = desktop.filter((_, i) => i < max);
  mobile = mobile.filter((_, i) => i < max);

  drawClientSummary(desktop, options, 'desktop');
  drawClientSummary(mobile, options, 'mobile');

  const container = document.getElementById(containerId);
  if (!container) return;

  callOnceWhenVisible(container, () => {
    renderEChartsHistogram(container, desktop, mobile, options);
  });
}

function renderEChartsHistogram(container, desktop, mobile, options) {
  container.innerHTML = '';

  const chartTitle = `${options.lens ? `${options.lens.name}: ` : ''}Distribution of ${options.name}`;

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

  // 2. Main Plot Host
  const mainPlotEl = document.createElement('div');
  mainPlotEl.className = 'chart-main-plot';
  container.appendChild(mainPlotEl);

  const chart = echarts.init(mainPlotEl, null, { renderer: 'svg' });

  // Extract all unique bins sorted
  const binSet = new Set();
  desktop.forEach(b => binSet.add(b.bin));
  mobile.forEach(b => binSet.add(b.bin));
  const sortedBins = Array.from(binSet).sort((a, b) => a - b);

  // Index maps
  const desktopMap = new Map(desktop.map(b => [b.bin, b]));
  const mobileMap = new Map(mobile.map(b => [b.bin, b]));

  const seriesList = [];
  const legendNames = [];
  const benchmarkMarkLines = [];

  if (desktop.length) {
    legendNames.push('Desktop');
    seriesList.push({
      name: 'Desktop',
      type: 'bar',
      data: sortedBins.map(bin => {
        const b = desktopMap.get(bin);
        return [bin, b ? Math.round(b.pdf * 10000) / 100 : 0];
      }),
      yAxisIndex: 0,
      itemStyle: { color: Colors.DESKTOP },
      barCategoryGap: '20%'
    });

    seriesList.push({
      name: 'Desktop CDF',
      type: 'line',
      data: sortedBins.map(bin => {
        const b = desktopMap.get(bin);
        return [bin, b ? Math.round(b.cdf * 10000) / 100 : 0];
      }),
      yAxisIndex: 1,
      itemStyle: { color: Colors.DESKTOP },
      lineStyle: { color: Colors.DESKTOP, width: 2, type: 'dashed' },
      showSymbol: false,
      step: 'end'
    });
  }

  if (mobile.length) {
    legendNames.push('Mobile');
    seriesList.push({
      name: 'Mobile',
      type: 'bar',
      data: sortedBins.map(bin => {
        const b = mobileMap.get(bin);
        return [bin, b ? Math.round(b.pdf * 10000) / 100 : 0];
      }),
      yAxisIndex: 0,
      itemStyle: { color: Colors.MOBILE },
      barCategoryGap: '20%'
    });

    seriesList.push({
      name: 'Mobile CDF',
      type: 'line',
      data: sortedBins.map(bin => {
        const b = mobileMap.get(bin);
        return [bin, b ? Math.round(b.cdf * 10000) / 100 : 0];
      }),
      yAxisIndex: 1,
      itemStyle: { color: Colors.MOBILE },
      lineStyle: { color: Colors.MOBILE, width: 2, type: 'dashed' },
      showSymbol: false,
      step: 'end'
    });
  }

  const option = {
    animation: false,
    grid: {
      top: 25,
      left: 60,
      right: 60,
      bottom: 62,
      containLabel: false
    },
    legend: {
      bottom: 0,
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
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#d1d5db',
      borderWidth: 1,
      padding: 10,
      extraCssText: 'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14); border-radius: 6px; backdrop-filter: blur(4px);',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(15, 23, 42, 0.05)' }
      },
      formatter: params => {
        if (!params || !params.length) return '';
        const binVal = params[0].value[0];
        const metricObj = new Metric(options, Math.round(binVal * 100) / 100);

        const dBin = desktopMap.get(binVal);
        const mBin = mobileMap.get(binVal);

        let html = `<div class="echarts-tooltip-card">`;
        html += `<div class="tooltip-date">${options.name}: ${metricObj.toString()}</div>`;
        html += `<table><tr>`;

        if (dBin) {
          html += `<td>
            <div class="series-label" style="color: ${Colors.DESKTOP};">Desktop</div>
            <div class="series-val" style="color: ${Colors.DESKTOP};">${(dBin.pdf * 100).toFixed(2)}%</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">CDF: ${(dBin.cdf * 100).toFixed(1)}%</div>
            <div style="font-size: 10px; color: #9ca3af;">Vol: ${dBin.volume.toLocaleString()}</div>
          </td>`;
        }

        if (mBin) {
          html += `<td>
            <div class="series-label" style="color: ${Colors.MOBILE};">Mobile</div>
            <div class="series-val" style="color: ${Colors.MOBILE};">${(mBin.pdf * 100).toFixed(2)}%</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">CDF: ${(mBin.cdf * 100).toFixed(1)}%</div>
            <div style="font-size: 10px; color: #9ca3af;">Vol: ${mBin.volume.toLocaleString()}</div>
          </td>`;
        }

        html += `</tr></table></div>`;
        return html;
      }
    },
    xAxis: {
      type: 'value',
      name: options.type || 'Metric Value',
      nameLocation: 'center',
      nameGap: 30,
      nameTextStyle: { color: '#64748b', fontSize: 12 },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        formatter: d => (d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d.toString())
      },
      splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Density (%)',
        nameLocation: 'center',
        nameGap: 45,
        nameTextStyle: { color: '#64748b', fontSize: 12 },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: '{value}%'
        },
        splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
      },
      {
        type: 'value',
        name: 'Cumulative Density (%)',
        nameLocation: 'center',
        nameGap: 45,
        min: 0,
        max: 100,
        nameTextStyle: { color: '#64748b', fontSize: 12 },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: '{value}%'
        },
        splitLine: { show: false }
      }
    ],
    series: seriesList
  };

  chart.setOption(option);

  // Legend toggling for CDF curves together with bars
  chart.on('legendselectchanged', params => {
    const isSelected = params.selected[params.name];
    const updateSelected = { ...params.selected };

    if (params.name === 'Desktop') {
      updateSelected['Desktop CDF'] = isSelected;
    } else if (params.name === 'Mobile') {
      updateSelected['Mobile CDF'] = isSelected;
    }

    chart.setOption({
      legend: { selected: updateSelected }
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

  // Context menu export actions
  dropdown?.querySelectorAll('.chart-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      dropdown.classList.add('hidden');
      menuBtn?.classList.remove('active');

      if (action === 'download-png') {
        exportEChartsHistogram(mainPlotEl, `${options.metric}-histogram`, 'png');
      } else if (action === 'download-svg') {
        exportEChartsHistogram(mainPlotEl, `${options.metric}-histogram`, 'svg');
      } else if (action === 'show-query') {
        const url = getQueryUrl(options.metric, 'histogram');
        if (url) window.open(url, '_blank');
      }
    });
  });

  // Window resize
  const onResize = debounce(() => {
    chart.resize();
  }, 100);
  window.addEventListener('resize', onResize);

  const chartController = {
    drawBenchmark: (name, value, color) => {
      benchmarkMarkLines.push({
        xAxis: value,
        name,
        lineStyle: { color: color || '#94a3b8', type: 'dashed' },
        label: { formatter: name, position: 'insideEndTop' }
      });
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

function exportEChartsHistogram(container, filename, format) {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;

  if (format === 'svg') {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (format === 'png') {
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

// Export directly to global scope
window.histogram = histogram;
export default histogram;
