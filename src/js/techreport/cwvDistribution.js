/* global Highcharts */

import { Constants } from './utils/constants';
import { UIUtils } from './utils/ui';

class CwvDistribution {
  // eslint-disable-next-line no-unused-vars -- pageConfig, config, data satisfy the Section component contract
  constructor(id, pageConfig, config, filters, data) {
    this.id = id;
    this.pageConfig = pageConfig;
    this.config = config;
    this.pageFilters = filters;
    this.distributionData = null;
    this.chart = null;
    this.root = document.querySelector(`[data-id="${this.id}"]`);
    this.date = this.pageFilters.end || this.root?.dataset?.latestDate || '';
    this.selectedMetric = this.resolveMetric(new URLSearchParams(window.location.search).get('good-cwv-over-time'));

    const updateDateFromTimeseries = (newDate) => {
      this.date = newDate;
      const tsSlot = this.root?.querySelector('[data-slot="cwv-distribution-timestamp"]');
      if (tsSlot && this.date) tsSlot.textContent = UIUtils.printMonthYear(this.date);
      if (!this.distributionData) {
        this.fetchData();
      }
    };

    if (!this.date) {
      // If we don't have a date, see if we can get it from the timeseries component
      // If not wait for the event to emit when the date is available
      const cwvChartDate = document.querySelector('#section-good_cwv_timeseries [data-slot=timestamp]');
      if (cwvChartDate && cwvChartDate.dataset.date) {
        updateDateFromTimeseries(cwvChartDate.dataset.date);
      } else {
        document.addEventListener('timeseries-date-updated', (event) => {
          if (event.detail.id === 'good_cwv_timeseries') {
            updateDateFromTimeseries(event.detail.date);
          }
        });
      }
    } else {
      // Populate "Latest data" timestamp immediately
      const tsSlot = this.root?.querySelector('[data-slot="cwv-distribution-timestamp"]');
      if (tsSlot && this.date) tsSlot.textContent = UIUtils.printMonthYear(this.date);
    }

    this.updateTitle();
    this.bindEventListeners();

    // Auto-expand if URL hash targets this section
    if (window.location.hash === `#section-${this.id}`) {
      this.toggle(true);
    }
  }

  // Map the shared metric value (which may be 'overall') to a metric this chart can show
  resolveMetric(value) {
    if (value && this.pageConfig.cwv_distribution.metric_config[value]) return this.pageConfig.cwv_distribution.metric_config[value].label;
    return 'LCP';
  }

  updateTitle() {
    const slot = this.root?.querySelector('[data-slot="cwv-distribution-title-metric"]');
    if (slot) slot.textContent = this.selectedMetric;
  }

  bindEventListeners() {
    if (!this.root) return;

    document.addEventListener('cwv-metric-change', (event) => {
      const resolved = this.resolveMetric(event.detail?.value);
      if (resolved !== this.selectedMetric) {
        this.selectedMetric = resolved;
        this.updateTitle();
        if (this.distributionData) this.renderChart();
      }
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
      if (btn) btn.textContent = 'Hide histogram';
      if (!this.date) {
        const cwvChartDate = document.querySelector('#section-good_cwv_timeseries [data-slot=timestamp]');
        this.date = cwvChartDate.dataset.date;
      }
      if (!this.distributionData && this.date) {
        this.fetchData();
      } else if (this.chart) {
        this.chart.reflow();
      }
      // Update the URL
      const url = new URL(window.location.href);
      url.hash = `#section-${this.id}`;
      window.history.replaceState(null, null, url);
    } else {
      this.root.classList.add('hidden');
      if (btn) btn.textContent = 'Show histogram';
      // Update the URL
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, null, url);
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
    const metricCfg = this.pageConfig.cwv_distribution.metric_config[this.selectedMetric];
    const thresholds = this.config.cwv_thresholds[this.selectedMetric];

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
    const zoneColors = theme === 'dark' ? this.pageConfig.cwv_distribution.zone_colors.dark : this.pageConfig.cwv_distribution.zone_colors.light;

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
        title: { text: metricCfg.axis_label, style: { color: textColor } },
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
