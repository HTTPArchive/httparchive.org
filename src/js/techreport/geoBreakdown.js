/* global Highcharts */

import { Constants } from './utils/constants';

class GeoBreakdown {
  constructor(id, pageConfig, config, filters, data) {
    this.id = id;
    this.pageConfig = pageConfig;
    this.config = config;
    this.pageFilters = filters;
    this.data = data;
    this.geoData = null;
    this.selectedMetric = 'overall';

    this.bindEventListeners();
    this.fetchData();
  }

  bindEventListeners() {
    const selector = `[data-id="${this.id}"] .geo-metric-selector`;
    document.querySelectorAll(selector).forEach(dropdown => {
      dropdown.addEventListener('change', event => {
        this.selectedMetric = event.target.value;
        if (this.geoData) this.renderChart();
      });
    });
  }

  fetchData() {
    const technology = this.pageFilters.app.map(encodeURIComponent).join(',');
    const rank = encodeURIComponent(this.pageFilters.rank || 'ALL');
    const url = `${Constants.apiBase}/geo-breakdown?technology=${technology}&rank=${rank}&start=latest`;

    fetch(url)
      .then(r => r.json())
      .then(rows => {
        this.geoData = rows;
        this.renderChart();
      })
      .catch(err => console.error('GeoBreakdown fetch error:', err));
  }

  // Called by Section.updateSection() when global filters (client, theme) change
  updateContent() {
    if (this.geoData) {
      this.renderChart();
    }
  }

  renderChart() {
    if (!this.geoData || this.geoData.length === 0) return;

    // Read the currently selected client from the DOM (updated by index.js updateClient)
    const component = document.querySelector(`[data-id="${this.id}"]`);
    const client = component?.dataset?.client || 'mobile';
    const metric = this.selectedMetric;

    // Pick the latest date per geo
    const geoMap = {};
    this.geoData.forEach(row => {
      if (!geoMap[row.geo] || row.date > geoMap[row.geo].date) {
        geoMap[row.geo] = row;
      }
    });

    // Extract good/total origins for the selected metric and client
    const geoEntries = Object.entries(geoMap).map(([geo, row]) => {
      const vitalEntry = row.vitals?.find(v => v.name === metric);
      const clientData = vitalEntry?.[client] || { good_number: 0, tested: 0 };
      return { geo, good: clientData.good_number, total: clientData.tested };
    }).filter(e => e.total > 0);

    // Sort descending by total origins so the largest market appears at the top
    geoEntries.sort((a, b) => b.total - a.total);

    const categories = geoEntries.map(e => e.geo);
    const goodVals  = geoEntries.map(e => e.good);
    const badVals   = geoEntries.map(e => e.total - e.good);
    const goodPct   = geoEntries.map(e => Math.round(e.good / e.total * 100));

    const isDark       = document.querySelector('html').dataset.theme === 'dark';
    const colorGood    = isDark ? 'var(--color-teal-vibrant-lighter, #2095A2)' : 'var(--color-teal-vibrant, #1c818d)';
    const colorBad     = isDark ? '#2f2f30' : '#e8e8e8';
    const colorText    = isDark ? '#fff'    : '#333';
    const colorLabels  = isDark ? '#8EA1A4' : '#5f6768';
    const colorGrid    = isDark ? '#1e1e1e' : '#f0f0f0';
    const colorAxis    = isDark ? '#555'    : '#cdd4d6';
    const colorBg      = 'transparent';
    const tooltipBg    = isDark ? '#111'    : '#fff';

    const chartHeight = Math.max(300, geoEntries.length * 26 + 80);

    Highcharts.chart(`${this.id}-chart`, {
      chart: {
        type: 'bar',
        height: chartHeight,
        backgroundColor: colorBg,
        marginRight: 10,
        style: { fontFamily: "var(--font-family-sans-serif, 'Open Sans', Arial, sans-serif)" },
      },
      title: { text: null },
      accessibility: { enabled: true },

      xAxis: {
        categories,
        labels: { style: { fontSize: '11px', color: colorText } },
        lineColor: colorAxis,
        tickColor: colorAxis,
      },

      yAxis: {
        min: 0,
        reversedStacks: false, // ensures series[0] (Good CWVs) renders on the LEFT
        title: {
          text: 'Number of origins',
          style: { fontSize: '10px', color: colorLabels },
        },
        labels: {
          formatter() {
            return this.value >= 1000 ? Math.round(this.value / 1000) + 'K' : this.value;
          },
          style: { fontSize: '10px', color: colorLabels },
        },
        gridLineColor: colorGrid,
      },

      legend: {
        enabled: true,
        align: 'left',
        verticalAlign: 'top',
        margin: 14,
        itemStyle: { fontSize: '11px', fontWeight: '400', color: colorText },
        itemHoverStyle: { color: colorText },
        symbolRadius: 2,
      },

      plotOptions: {
        series: {
          stacking: 'normal',
          borderWidth: 0,
          borderRadius: 2,
          pointPadding: 0.08,
          groupPadding: 0.12,
        },
      },

      tooltip: {
        useHTML: true,
        shared: true,
        backgroundColor: tooltipBg,
        borderColor: colorAxis,
        style: { color: colorText },
        formatter() {
          const idx = this.points[0].point.index;
          const e = geoEntries[idx];
          const pct = goodPct[idx];
          return `<div style="font-size:11px;padding:2px 4px">
            <b>${e.geo}</b><br/>
            <span style="color:${colorGood}">●</span> Good CWVs: <b>${e.good.toLocaleString()}</b> (${pct}%)<br/>
            ● Not passing: <b>${(e.total - e.good).toLocaleString()}</b><br/>
            Total: <b>${e.total.toLocaleString()}</b>
          </div>`;
        },
      },

      series: [
        {
          name: 'Good CWVs',
          data: goodVals,
          color: colorGood,
          dataLabels: {
            enabled: true,
            inside: true,
            align: 'right',
            style: {
              fontSize: '10px',
              fontWeight: '700',
              color: '#fff',
              textOutline: 'none',
            },
            formatter() {
              return goodPct[this.point.index] + '%';
            },
          },
        },
        {
          name: 'Not passing',
          data: badVals,
          color: colorBad,
        },
      ],

      credits: { enabled: false },
    });
  }
}

window.GeoBreakdown = GeoBreakdown;
