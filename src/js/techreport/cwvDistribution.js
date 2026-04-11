/* global Highcharts */

import { Constants } from './utils/constants';
import { UIUtils } from './utils/ui';

const METRIC_CONFIG = {
  LCP:  { bucketField: 'loading_bucket', originsField: 'lcp_origins',  unit: 'ms', label: 'LCP (ms)', step: 100 },
  FCP:  { bucketField: 'loading_bucket', originsField: 'fcp_origins',  unit: 'ms', label: 'FCP (ms)', step: 100 },
  TTFB: { bucketField: 'loading_bucket', originsField: 'ttfb_origins', unit: 'ms', label: 'TTFB (ms)', step: 100 },
  INP:  { bucketField: 'inp_bucket',     originsField: 'inp_origins',  unit: 'ms', label: 'INP (ms)', step: 25 },
  CLS:  { bucketField: 'cls_bucket',     originsField: 'cls_origins',  unit: '',   label: 'CLS', step: 0.05 },
};

const THRESHOLDS = {
  LCP:  [{ value: 2500, label: 'Good' }, { value: 4000, label: 'Needs improvement' }],
  FCP:  [{ value: 1800, label: 'Good' }, { value: 3000, label: 'Needs improvement' }],
  TTFB: [{ value: 800,  label: 'Good' }, { value: 1800, label: 'Needs improvement' }],
  INP:  [{ value: 200,  label: 'Good' }, { value: 500,  label: 'Needs improvement' }],
  CLS:  [{ value: 0.1,  label: 'Good' }, { value: 0.25, label: 'Needs improvement' }],
};

const ZONE_COLORS = {
  light: { good: '#0CCE6B', needsImprovement: '#FFA400', poor: '#FF4E42', text: '#444', gridLine: '#e6e6e6' },
  dark:  { good: '#0CCE6B', needsImprovement: '#FBBC04', poor: '#FF6659', text: '#ccc', gridLine: '#444' },
};

class CwvDistribution {
  // eslint-disable-next-line no-unused-vars -- pageConfig, config, data satisfy the Section component contract
  constructor(id, pageConfig, config, filters, data) {
    this.id = id;
    this.pageFilters = filters;
    this.distributionData = null;
    this.selectedMetric = 'LCP';
    this.chart = null;
    this.root = document.querySelector(`[data-id="${this.id}"]`);
    this.date = this.pageFilters.end || this.root?.dataset?.latestDate || '';

    // Populate "Latest data" timestamp immediately
    const tsSlot = this.root?.querySelector('[data-slot="cwv-distribution-timestamp"]');
    if (tsSlot && this.date) tsSlot.textContent = UIUtils.printMonthYear(this.date);


    this.bindEventListeners();

    // Auto-expand if URL hash targets this section
    if (window.location.hash === `#section-${this.id}`) {
      this.toggle(true);
    }
  }

  bindEventListeners() {
    if (!this.root) return;

    this.root.querySelectorAll('.cwv-distribution-metric-selector').forEach(dropdown => {
      dropdown.addEventListener('change', event => {
        this.selectedMetric = event.target.value;
        if (this.distributionData) this.renderChart();
      });
    });

    const btn = document.getElementById('cwv-distribution-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const isVisible = !this.root.classList.contains('hidden');
        this.toggle(!isVisible);
      });
    }
  }

  toggle(show) {
    const btn = document.getElementById('cwv-distribution-btn');
    if (show) {
      this.root.classList.remove('hidden');
      if (btn) btn.textContent = 'Hide distribution';
      if (!this.distributionData) {
        this.fetchData();
      } else if (this.chart) {
        this.chart.reflow();
      }
    } else {
      this.root.classList.add('hidden');
      if (btn) btn.textContent = 'Show distribution';
    }
  }

  get chartContainer() {
    return document.getElementById(`${this.id}-chart`);
  }

  updateContent() {
    if (this.distributionData) this.renderChart();
  }

  showLoader() {
    if (!this.chartContainer) return;
    this.chartContainer.innerHTML = '<div class="cwv-distribution-loader"><div class="cwv-distribution-spinner"></div><p>Loading distribution data…</p></div>';
  }

  hideLoader() {
    if (!this.chartContainer) return;
    const loader = this.chartContainer.querySelector('.cwv-distribution-loader');
    if (loader) loader.remove();
  }

  showError() {
    if (!this.chartContainer) return;
    this.chartContainer.innerHTML = '<div class="cwv-distribution-error">Distribution data is not available for this selection.</div>';
  }

  fetchData() {
    this.showLoader();

    const technology = this.pageFilters.app.map(encodeURIComponent).join(',');
    const rank = encodeURIComponent(this.pageFilters.rank || 'ALL');
    const geo = encodeURIComponent(this.pageFilters.geo || 'ALL');
    let url = `${Constants.apiBase}/cwv-distribution?technology=${technology}&rank=${rank}&geo=${geo}`;
    if (this.date) {
      url += `&date=${encodeURIComponent(this.date)}`;
    }

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(rows => {
        if (!Array.isArray(rows) || rows.length === 0) throw new Error('Empty response');
        this.distributionData = rows;
        this.hideLoader();
        this.renderChart();
      })
      .catch(err => {
        console.error('CWV Distribution fetch error:', err);
        this.showError();
      });
  }

  trimWithOverflow(rows, originsField, percentile) {
    const total = rows.reduce((sum, row) => sum + row[originsField], 0);
    if (total === 0) return { visible: rows, overflowCount: 0 };

    const cutoff = total * percentile;
    let cumulative = 0;
    let cutIndex = rows.length;
    for (let i = 0; i < rows.length; i++) {
      cumulative += rows[i][originsField];
      if (cumulative >= cutoff) {
        cutIndex = Math.min(i + 2, rows.length);
        break;
      }
    }

    const visible = rows.slice(0, cutIndex);
    const visibleSum = visible.reduce((sum, row) => sum + row[originsField], 0);
    return { visible, overflowCount: total - visibleSum };
  }

  renderChart() {
    if (!this.distributionData || this.distributionData.length === 0) return;
    if (!this.root) return;

    const client = this.root.dataset.client || 'mobile';
    const metricCfg = METRIC_CONFIG[this.selectedMetric];
    const thresholds = THRESHOLDS[this.selectedMetric];

    const clientRows = this.distributionData
      .filter(row => row.client === client)
      .sort((a, b) => a[metricCfg.bucketField] - b[metricCfg.bucketField]);

    const { visible, overflowCount } = this.trimWithOverflow(
      clientRows, metricCfg.originsField, 0.995
    );

    const formatBucket = (val) => {
      if (metricCfg.unit === 'ms') {
        return val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`;
      }
      return String(val);
    };

    const categories = visible.map(row => formatBucket(row[metricCfg.bucketField]));
    const seriesData = visible.map(row => row[metricCfg.originsField]);

    if (overflowCount > 0) {
      const rawNext = visible[visible.length - 1][metricCfg.bucketField] + metricCfg.step;
      const nextBucket = Math.round(rawNext * 1e6) / 1e6;
      categories.push(`${formatBucket(nextBucket)}+`);
      seriesData.push(overflowCount);
    }

    const theme = document.querySelector('html').dataset.theme;
    const zoneColors = theme === 'dark' ? ZONE_COLORS.dark : ZONE_COLORS.light;

    const getColor = (val) => {
      if (val < thresholds[0].value) return zoneColors.good;
      if (val < thresholds[1].value) return zoneColors.needsImprovement;
      return zoneColors.poor;
    };

    const colors = visible.map(row => getColor(row[metricCfg.bucketField]));
    if (overflowCount > 0) {
      colors.push(zoneColors.poor);
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (!this.chartContainer) return;
    const chartContainerId = `${this.id}-chart`;

    const textColor = zoneColors.text;
    const gridLineColor = zoneColors.gridLine;

    const plotLineColors = [zoneColors.good, zoneColors.needsImprovement];
    const plotLines = thresholds.map((t, i) => {
      const idx = visible.findIndex(row => row[metricCfg.bucketField] >= t.value);
      if (idx === -1) return null;
      return {
        value: idx - 0.5,
        color: plotLineColors[i],
        width: 2,
        dashStyle: 'Dash',
        label: {
          text: `${t.label} (${metricCfg.unit ? t.value + metricCfg.unit : t.value})`,
          style: { fontSize: '11px', color: textColor },
        },
        zIndex: 5,
      };
    }).filter(Boolean);

    this.chart = Highcharts.chart(chartContainerId, {
      chart: { type: 'column', backgroundColor: 'transparent' },
      title: { text: null },
      xAxis: {
        categories,
        title: { text: metricCfg.label, style: { color: textColor } },
        labels: {
          step: Math.ceil(categories.length / 20),
          rotation: -45,
          style: { color: textColor },
          formatter: function () {
            const lastIndex = categories.length - 1;
            const labelStep = Math.ceil(categories.length / 20);
            if (this.pos === lastIndex || this.pos % labelStep === 0) {
              return this.value;
            }
            return null;
          },
        },
        lineColor: gridLineColor,
        plotLines,
      },
      yAxis: {
        title: { text: 'Number of origins', style: { color: textColor } },
        labels: { style: { color: textColor } },
        gridLineColor,
        min: 0,
      },
      legend: { enabled: false },
      tooltip: {
        formatter: function () {
          return `<b>${this.x}</b><br/>Origins: <b>${this.y.toLocaleString()}</b>`;
        },
      },
      plotOptions: {
        column: {
          pointPadding: 0,
          groupPadding: 0,
          borderWidth: 0,
          borderRadius: 0,
          crisp: false,
        },
      },
      series: [{
        name: 'Origins',
        data: seriesData.map((value, i) => ({ y: value, color: colors[i] })),
      }],
      credits: { enabled: false },
    });
  }
}

window.CwvDistribution = CwvDistribution;
