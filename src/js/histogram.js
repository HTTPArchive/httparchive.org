import * as echarts from 'echarts';
import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, prettyDate, drawMetricSummary, callOnceWhenVisible, getQueryUrl } from './utils';
import { Constants } from './techreport/utils/constants.js';

const [COLOR_DESKTOP, COLOR_MOBILE] = Colors.getAll({ rgba: true });

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
      drawHistogramTable(data, `${metric}-table`, options.type);
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
    this.maxPdf = Math.max.apply(null, this.bins.map(bin => bin.pdf)) || 1;
  }

  draw() {
    if (!this.table) return;
    Array.from(this.table.children).forEach(child => this.table.removeChild(child));

    const thead = el('thead');
    const headerRow = el('tr');
    ['Bin (' + (this.type || 'Value') + ')', 'Client', 'Volume', 'PDF', 'CDF'].forEach(col => {
      const th = el('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    const tbody = el('tbody');
    const binMap = new Map();
    this.bins.forEach(b => {
      if (!binMap.has(b.bin)) binMap.set(b.bin, []);
      binMap.get(b.bin).push(b);
    });

    const sortedBins = Array.from(binMap.keys()).sort((a, b) => a - b);
    sortedBins.forEach(binVal => {
      const clientBins = binMap.get(binVal);
      clientBins.sort(a => (a.client === 'desktop' ? -1 : 1));
      clientBins.forEach((b, idx) => {
        const tr = el('tr');
        if (idx === 0) {
          const tdBin = el('td');
          if (clientBins.length > 1) {
            tdBin.setAttribute('rowspan', clientBins.length.toString());
          }
          tdBin.textContent = b.format('bin');
          tdBin.classList.add('bin');
          tr.appendChild(tdBin);
        }

        const tdClient = el('td');
        tdClient.textContent = b.client ? b.client.charAt(0).toUpperCase() + b.client.slice(1) : '';
        tdClient.classList.add('client');
        tr.appendChild(tdClient);

        const tdVol = el('td');
        tdVol.classList.add('volume');
        const bar = el('div');
        bar.style.width = `${(b.pdf * 100) / this.maxPdf}%`;
        bar.classList.add(b.client);
        tdVol.appendChild(bar);
        const text = el('span');
        text.textContent = b.format('volume');
        tdVol.appendChild(text);
        tr.appendChild(tdVol);

        const tdPdf = el('td');
        tdPdf.classList.add('pdf');
        tdPdf.textContent = b.format('pdf');
        tr.appendChild(tdPdf);

        const tdCdf = el('td');
        tdCdf.classList.add('cdf');
        tdCdf.textContent = b.format('cdf');
        tr.appendChild(tdCdf);

        tbody.appendChild(tr);
      });
    });
    this.table.appendChild(tbody);
  }
}

let redrawHistogramTable = null;
function drawHistogramTable(data, tableId, type, [start, end] = [-Infinity, Infinity]) {
  if (!redrawHistogramTable) {
    redrawHistogramTable = debounce((tblId, typ, range) => {
      return drawHistogramTable(data, tblId, typ, range);
    }, 100);
  }

  const bins = data
    .filter(d => d.bin >= start && d.bin <= end)
    .map(d => new Bin(d));

  new HistogramTable(tableId, bins, type).draw();
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
    renderEChartsHistogram(container, desktop, mobile, options, data);
  });
}

function renderEChartsHistogram(container, desktop, mobile, options, rawData) {
  container.innerHTML = '';

  const chartTitle = `${options.lens ? `${options.lens.name}: ` : ''}Histogram of ${options.name}`;

  // 1. Header Card Element
  const header = document.createElement('div');
  header.className = 'chart-header';
  header.innerHTML = `
    <h3 class="chart-title">${chartTitle}</h3>
    <div class="chart-subtitle">Source: <a href="https://httparchive.org" target="_blank" rel="noopener">httparchive.org</a>${options.date ? ` (${prettyDate(options.date)})` : ''}</div>
    <div class="chart-header-actions">
      <button class="reset-zoom-btn hidden" aria-label="Reset zoom">Reset zoom</button>
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
      itemStyle: { color: COLOR_DESKTOP },
      barCategoryGap: '20%',
      barGap: '-100%'
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
      lineStyle: { color: Colors.DESKTOP, width: 2, type: 'solid' },
      showSymbol: false,
      symbol: 'none',
      emphasis: { disabled: true }
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
      itemStyle: { color: COLOR_MOBILE },
      barCategoryGap: '20%',
      barGap: '-100%'
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
      lineStyle: { color: Colors.MOBILE, width: 2, type: 'solid' },
      showSymbol: false,
      symbol: 'none',
      emphasis: { disabled: true }
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
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: '#374151',
        fontSize: 12
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [8, 12],
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
        html += `<div class="tooltip-date">${metricObj.toString()}</div>`;
        html += `<table><tr>`;

        if (dBin) {
          html += `<td>
            <div class="series-label" style="color: ${Colors.DESKTOP};">Desktop</div>
            <div class="series-val" style="color: ${Colors.DESKTOP}; font-size: 18px; font-weight: 700; margin: 2px 0;">${(dBin.pdf * 100).toFixed(2)}%</div>
            <div class="series-sublabel">Cumulative</div>
            <div class="series-subval" style="color: ${Colors.DESKTOP};">${(dBin.cdf * 100).toFixed(2)}%</div>
          </td>`;
        }

        if (mBin) {
          html += `<td>
            <div class="series-label" style="color: ${Colors.MOBILE};">Mobile</div>
            <div class="series-val" style="color: ${Colors.MOBILE}; font-size: 18px; font-weight: 700; margin: 2px 0;">${(mBin.pdf * 100).toFixed(2)}%</div>
            <div class="series-sublabel">Cumulative</div>
            <div class="series-subval" style="color: ${Colors.MOBILE};">${(mBin.cdf * 100).toFixed(2)}%</div>
          </td>`;
        }

        html += `</tr></table></div>`;
        return html;
      }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: false,
        moveOnMouseMove: false
      }
    ],
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
        name: 'Density',
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
        name: 'Cumulative Density',
        nameLocation: 'center',
        nameRotate: -90,
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

  // Reset zoom & selection zoom interactions
  const resetZoomBtn = header.querySelector('.reset-zoom-btn');

  const resetZoom = () => {
    chart.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    });
    resetZoomBtn?.classList.add('hidden');
    if (rawData) {
      drawHistogramTable(rawData, `${options.metric}-table`, options.type, [-Infinity, Infinity]);
    }
  };

  resetZoomBtn?.addEventListener('click', resetZoom);

  // Mouse drag selection zoom with visual background area
  let dragStartX = null;
  let selectionBox = null;
  mainPlotEl.style.position = 'relative';

  const onMouseDown = e => {
    if (e.button !== 0) return;
    const rect = mainPlotEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 40 && x <= rect.width - 40 && y >= 10 && y <= rect.height - 40) {
      dragStartX = e.clientX;
      chart.dispatchAction({ type: 'hideTip' });
      e.preventDefault();
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'crosshair';
      window.addEventListener('mousemove', onMouseMove, { capture: true });
      window.addEventListener('mouseup', onMouseUp, { capture: true });
    }
  };

  const onMouseMove = e => {
    if (dragStartX === null) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 3) {
      e.stopPropagation();
      if (!selectionBox) {
        selectionBox = document.createElement('div');
        selectionBox.className = 'chart-zoom-selection';
        const rect = mainPlotEl.getBoundingClientRect();
        const plotHeight = rect.height - 25 - 62;
        selectionBox.style.height = `${plotHeight}px`;
        mainPlotEl.appendChild(selectionBox);
      }
      chart.dispatchAction({ type: 'hideTip' });
      const rect = mainPlotEl.getBoundingClientRect();
      const left = Math.max(60, Math.min(dragStartX, e.clientX) - rect.left);
      const right = Math.min(rect.width - 60, Math.max(dragStartX, e.clientX) - rect.left);
      selectionBox.style.left = `${left}px`;
      selectionBox.style.width = `${Math.max(0, right - left)}px`;
    }
  };

  const onMouseUp = e => {
    window.removeEventListener('mousemove', onMouseMove, { capture: true });
    window.removeEventListener('mouseup', onMouseUp, { capture: true });
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    if (dragStartX !== null) {
      const dx = Math.abs(e.clientX - dragStartX);
      if (dx > 10) {
        const rect = mainPlotEl.getBoundingClientRect();
        const startX = Math.min(dragStartX, e.clientX) - rect.left;
        const endX = Math.max(dragStartX, e.clientX) - rect.left;
        const val1 = chart.convertFromPixel({ xAxisIndex: 0 }, startX);
        const val2 = chart.convertFromPixel({ xAxisIndex: 0 }, endX);
        if (val1 != null && val2 != null) {
          const minVal = Math.min(val1, val2);
          const maxVal = Math.max(val1, val2);
          if (maxVal > minVal) {
            chart.dispatchAction({
              type: 'dataZoom',
              startValue: minVal,
              endValue: maxVal
            });
            resetZoomBtn?.classList.remove('hidden');
            if (rawData) {
              drawHistogramTable(rawData, `${options.metric}-table`, options.type, [minVal, maxVal]);
            }
          }
        }
      }
      dragStartX = null;
    }

    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  };

  mainPlotEl.addEventListener('mousedown', onMouseDown, { capture: true });

  chart.on('datazoom', () => {
    const opt = chart.getOption();
    const dz = opt.dataZoom && opt.dataZoom[0];
    if (dz) {
      const isZoomed =
        (dz.startValue !== undefined && dz.endValue !== undefined) ||
        (dz.start !== undefined && (dz.start > 0.5 || dz.end < 99.5));
      if (isZoomed) {
        resetZoomBtn?.classList.remove('hidden');
      } else {
        resetZoomBtn?.classList.add('hidden');
      }

      if (rawData) {
        let minVal = -Infinity;
        let maxVal = Infinity;
        if (dz.startValue !== undefined && dz.endValue !== undefined) {
          minVal = dz.startValue;
          maxVal = dz.endValue;
        } else if (dz.start !== undefined && dz.end !== undefined) {
          const xMin = opt.xAxis?.[0]?.min ?? sortedBins[0];
          const xMax = opt.xAxis?.[0]?.max ?? sortedBins[sortedBins.length - 1];
          const span = xMax - xMin;
          minVal = xMin + (span * dz.start) / 100;
          maxVal = xMin + (span * dz.end) / 100;
        }
        drawHistogramTable(rawData, `${options.metric}-table`, options.type, [minVal, maxVal]);
      }
    }
  });

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
        const url = getQueryUrl(options.metric);
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

  window.charts = window.charts || {};
  window.charts[options.metric] = chartController;

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
