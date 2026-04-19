import { Constants } from './utils/constants';
import { UIUtils } from './utils/ui';

const METRIC_CONFIG = {
  overall: 'overall',
  LCP: 'LCP',
  FCP: 'FCP',
  TTFB: 'TTFB',
  INP: 'INP',
  CLS: 'CLS',
};

class GeoBreakdown {
  constructor(id, pageConfig, config, filters, data) {
    this.id = id;
    this.pageConfig = pageConfig;
    this.config = config;
    this.pageFilters = filters;
    this.data = data;
    this.geoData = null;
    this.selectedMetric = this.resolveMetric(new URLSearchParams(window.location.search).get('good-cwv-over-time')) || 'overall';
    this.sortColumn = 'total';
    this.sortDir = 'desc';
    this.showAll = false;

    this.updateTitle();
    this.bindEventListeners();

    // Auto-expand if URL hash targets this section
    if (window.location.hash === `#section-${this.id}`) {
      this.toggle(true);
    }
  }

  // Map the shared metric value (which may be 'overall') to a metric this chart can show
  resolveMetric(value) {
    if (value && METRIC_CONFIG[value]) return METRIC_CONFIG[value];
    return 'overall';
  }

  toggle(show) {
    const wrapper = document.getElementById(`section-${this.id}`);
    const btn = document.getElementById('geo-breakdown-btn');
    if (show) {
      if (wrapper) wrapper.classList.remove('hidden');
      if (btn) btn.textContent = 'Hide geographic breakdown';
      if (!this.geoData) {
        this.fetchData();
      }
      // Update the URL
      const url = new URL(window.location.href);
      url.hash = `#section-${this.id}`;
      window.history.replaceState(null, null, url);
    } else {
      if (wrapper) wrapper.classList.add('hidden');
      if (btn) btn.textContent = 'Show geographic breakdown';
      // Update the URL
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, null, url);
    }
  }

  updateTitle() {
    const slot = document.querySelector('[data-slot="geo-title-metric"]');
    if (!slot) return;
    slot.textContent = this.selectedMetric === 'overall' ? 'Core Web Vitals' : this.selectedMetric;
  }

  bindEventListeners() {
    document.addEventListener('cwv-metric-change', (event) => {
      const value = event.detail?.value;
      if (value && value !== this.selectedMetric) {
        this.selectedMetric = value;
        this.updateTitle();
        if (this.geoData) this.renderTable();
      }
    });

    const btn = document.getElementById('geo-breakdown-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const wrapper = document.getElementById(`section-${this.id}`);
        const isVisible = wrapper && !wrapper.classList.contains('hidden');
        this.toggle(!isVisible);
      });
    }
  }

  showLoader() {
    const container = document.getElementById(`${this.id}-table`);
    if (!container) return;
    container.innerHTML = '<div class="cwv-distribution-loader"><div class="cwv-distribution-spinner"></div><p>Loading geographic data…</p></div>';
  }

  hideLoader() {
    const container = document.getElementById(`${this.id}-table`);
    if (!container) return;
    const loader = container.querySelector('.cwv-distribution-loader');
    if (loader) loader.remove();
  }

  fetchData() {
    this.showLoader();

    const technology = this.pageFilters.app.map(encodeURIComponent).join(',');
    const rank = encodeURIComponent(this.pageFilters.rank || 'ALL');
    const end = this.pageFilters.end ? `&end=${encodeURIComponent(this.pageFilters.end)}` : '';
    const url = `${Constants.apiBase}/geo-breakdown?technology=${technology}&rank=${rank}${end}`;

    fetch(url)
      .then(r => r.json())
      .then(rows => {
        this.geoData = rows;
        this.hideLoader();
        this.renderTable();
      })
      .catch(err => {
        console.error('GeoBreakdown fetch error:', err);
        this.hideLoader();
      });
  }

  updateContent() {
    if (this.geoData) this.renderTable();
  }

  sortEntries(entries) {
    const col = this.sortColumn;
    const dir = this.sortDir === 'desc' ? -1 : 1;
    return entries.slice().sort((a, b) => {
      let av, bv;
      if (col === 'total') { av = a.total; bv = b.total; }
      else if (col === 'good_pct') { av = a.good / a.total; bv = b.good / b.total; }
      else { av = a[col] != null ? a[col] : -1; bv = b[col] != null ? b[col] : -1; }
      return (av - bv) * dir;
    });
  }

  renderTable() {
    if (!this.geoData || !this.geoData.length || this.geoData.length === 0) return;

    const component = document.querySelector(`[data-id="${this.id}"]`);
    const client = component?.dataset?.client || 'mobile';

    // Determine bar label and which extra columns to show
    const metric = this.selectedMetric;
    const barLabel = metric === 'overall' ? 'Good Core Web Vitals' : `Good ${metric}`;
    const extraCols = ['LCP', 'FCP', 'TTFB'].includes(metric)
      ? [{ key: 'ttfb', label: 'TTFB' }, { key: 'fcp', label: 'FCP' }, { key: 'lcp', label: 'LCP' }].filter(c => c.key !== metric.toLowerCase())
      : metric === 'overall'
        ? [{ key: 'lcp', label: 'LCP' }, { key: 'inp', label: 'INP' }, { key: 'cls', label: 'CLS' }]
        : []; // INP/CLS: no extra columns

    // If current sort column is no longer visible, reset to total
    const extraKeys = extraCols.map(c => c.key);
    if (['lcp', 'inp', 'cls', 'fcp', 'ttfb'].includes(this.sortColumn) && !extraKeys.includes(this.sortColumn)) {
      this.sortColumn = 'total';
      this.sortDir = 'desc';
    }

    // Pick latest date per geo, excluding "ALL"
    const geoMap = {};
    let latestDate = null;
    this.geoData.forEach(row => {
      if (!geoMap[row.geo] || row.date > geoMap[row.geo].date) geoMap[row.geo] = row;
      if (!latestDate || row.date > latestDate) latestDate = row.date;
    });

    // Fill timestamp slot
    const tsSlot = component?.querySelector('[data-slot="geo-timestamp"]');
    if (tsSlot && latestDate) tsSlot.textContent = UIUtils.printMonthYear(latestDate);

    // Extract data per geo
    const rawEntries = Object.entries(geoMap).map(([geo, row]) => {
      const vital = row.vitals?.find(v => v.name === metric);
      const d = vital?.[client] || { good_number: 0, tested: 0 };
      const pctFor = name => {
        const v = row.vitals?.find(x => x.name === name)?.[client];
        return v?.tested > 0 ? Math.round(v.good_number / v.tested * 100) : null;
      };
      return { geo, good: d.good_number, total: d.tested, lcp: pctFor('LCP'), inp: pctFor('INP'), cls: pctFor('CLS'), fcp: pctFor('FCP'), ttfb: pctFor('TTFB') };
    }).filter(e => e.total > 0);

    // Sort by origins, limit to top 10 unless showAll
    const sorted = rawEntries.slice().sort((a, b) => b.total - a.total);
    const limited = this.showAll ? sorted : sorted.slice(0, 10);
    const entries = this.sortEntries(limited);

    const container = document.getElementById(`${this.id}-table`);
    if (!container) return;

    const table = document.createElement('table');
    table.className = 'table-ui geo-breakdown-table';

    // Header with sortable columns
    const cols = [
      { key: 'geo',      label: 'Geography', cls: '' },
      { key: 'total',    label: 'Origins',   cls: 'geo-origins-col' },
      { key: 'good_pct', label: barLabel,    cls: 'geo-cwv-col' },
      ...extraCols.map(c => ({ ...c, cls: 'geo-vital-col' })),
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    cols.forEach(col => {
      const th = document.createElement('th');
      th.className = [col.cls, 'geo-sortable-col'].filter(Boolean).join(' ');
      const isActive = this.sortColumn === col.key;
      th.innerHTML = col.label + (isActive ? `<span class="geo-sort-arrow">${this.sortDir === 'desc' ? ' ▼' : ' ▲'}</span>` : '');
      if (col.key !== 'geo') {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
          this.sortColumn = col.key;
          this.sortDir = this.sortColumn === col.key && this.sortDir === 'desc' ? 'asc' : 'desc';
          this.renderTable();
        });
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    entries.forEach(e => {
      const goodPct = Math.round(e.good / e.total * 100);
      const tr = document.createElement('tr');

      const tdGeo = document.createElement('td');
      tdGeo.className = 'geo-name-cell';
      tdGeo.textContent = e.geo;
      tdGeo.title = e.geo;
      tr.appendChild(tdGeo);

      const tdOrigins = document.createElement('td');
      tdOrigins.className = 'geo-origins-col numeric';
      tdOrigins.textContent = e.total.toLocaleString();
      tr.appendChild(tdOrigins);

      const tdBar = document.createElement('td');
      tdBar.className = 'cwv-cell geo-pct-cell geo-cwv-col';
      tdBar.style.setProperty('--good-stop', goodPct + '%');
      tdBar.style.setProperty('--bar-total', '1');
      tdBar.dataset.value = goodPct;
      const label = document.createElement('span');
      label.className = 'geo-pct-label';
      label.textContent = goodPct + '%';
      tdBar.appendChild(label);
      const bar = document.createElement('span');
      bar.className = 'geo-bar';
      bar.setAttribute('aria-hidden', 'true');
      tdBar.appendChild(bar);
      tr.appendChild(tdBar);

      extraCols.forEach(({ key }) => {
        const td = document.createElement('td');
        td.className = 'geo-vital-col numeric';
        td.textContent = e[key] != null ? e[key] + '%' : '—';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    const wrapper = document.createElement('div');
    wrapper.className = 'table-ui-wrapper';
    wrapper.appendChild(table);
    const btn = document.createElement('button');
    btn.className = 'btn show-table';
    btn.type = 'button';
    btn.textContent = this.showAll ? 'Show fewer' : `Show all ${sorted.length} geographies`;
    btn.addEventListener('click', () => {
      this.showAll = !this.showAll;
      this.renderTable();
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
    container.appendChild(btn);
  }
}

window.GeoBreakdown = GeoBreakdown;
