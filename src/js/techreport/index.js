import Filters from '../components/filters';
import Section from './section';
import { Constants } from './utils/constants';
import { DrilldownHeader } from "../components/drilldownHeader";
import { DataUtils } from "./utils/data";
import { UIUtils } from "./utils/ui";
import { UrlUtils } from "./utils/url";

class TechReport {
  constructor(pageId, page, config, labels) {
    this.filters = page.filters;
    this.allData = [];
    this.config = config;
    this.labels = labels;
    this.pageId = pageId;
    this.sections = {};

    // Pass the labels into the page data, and for comparison pages add
    // `comparison_*` key aliases so Timeseries can find section config by
    // its DOM data-id (e.g. `comparison_good_cwv_timeseries`).
    const baseConfig = {
      ...page.config,
      labels: labels,
    };
    if (pageId === 'comparison') {
      Object.keys(page.config).forEach(key => {
        if (!['colors', 'default', 'labels'].includes(key)) {
          baseConfig[`comparison_${key}`] = page.config[key];
        }
      });
    }
    this.page = {
      ...page,
      config: baseConfig,
    };

    // Load the page
    this.initializePage();
    this.initializeFilters();
    this.initializeAccessibility();

    // Watch for settings updates
    this.bindSettingsListeners();
  }

  // Initialize the filter toggle
  initializeFilters() {
    const closeButton = document.getElementById('close-filters');
    const openButton = document.getElementById('open-filters');
    const filters = document.getElementsByClassName('filters')[0];
    const mobileFilters = document.getElementById('mobile-filter-container');
    const reportFilters = document.getElementById('report-filters');
    const openButtonMobile = document.getElementById('open-filters-mobile');

    closeButton?.addEventListener('click', () => {
      filters.classList.add('hidden');
      openButton.classList.remove('hidden');
      openButton.focus();
    });

    openButton?.addEventListener('click', () => {
      filters.classList.remove('hidden');
      openButton.classList.add('hidden');
      closeButton.focus();
    });

    openButtonMobile?.addEventListener('click', () => {
      if(mobileFilters.classList.contains('hidden')) {
        mobileFilters.replaceChildren(reportFilters);
        mobileFilters.classList.remove('hidden');
        document.getElementById('close-filters').classList.remove('hidden');
        openButtonMobile.setAttribute('aria-expanded', true);
      } else {
        filters.replaceChildren(reportFilters);
        mobileFilters.classList.add('hidden');
        openButtonMobile.setAttribute('aria-expanded', false);
      }
    });
  }

  // Initialize the sections for the different pages
  initializePage() {
    this.updateStyling();

    switch(this.pageId) {
      case 'landing':
        this.initializeLanding();
        this.getAllMetricData();
        break;

      case 'drilldown':
        this.initializeReport();
        this.getAllMetricData();
        this.getTechInfo();
        break;

      case 'comparison':
        this.initializeReport();
        this.getAllMetricData();
        break;

      case 'category': {
        this.initializeReport();
        this.getCategoryData();
        break;
      }
    }
  }

  // Load accessibility/themeing info
  initializeAccessibility() {
    // Show indicators?
    const showIndicators = localStorage.getItem('showIndicators');
    document.querySelector('main').dataset.showIndicators = showIndicators;
    document.querySelector('#indicators-check').checked = showIndicators === 'true';

    // Dark or light mode?
    const theme = localStorage.getItem('haTheme');
    document.querySelector('html').dataset.theme = theme;
    const btn = document.querySelector('.theme-switcher');
    if(theme === 'dark') {
      btn.innerHTML = '🌝 Switch to light theme';
    } else if(theme === 'light') {
      btn.innerHTML = '🌚 Switch to dark theme';
    }
  }

  initializeLanding() {
  }

  // Initialize the report pages
  initializeReport() {
    // Apply client settings and watch for updates before initializing sections
    this.bindClientListener();
    this.bindSubcategoryListener();

    if (this.pageId === 'drilldown') {
      DrilldownHeader.update(this.filters);
    } else {
      DrilldownHeader.updateFilterMeta(this.filters);
      if (this.pageId === 'category') {
        const mainTitle = document.querySelector('h1 span.main-title');
        if (mainTitle && this.filters.category) {
          mainTitle.textContent = this.filters.category;
        }
      }
    }

    const sections = document.querySelectorAll('[data-type="section"]');

    // Create new class for each of the sections
    sections.forEach(section => {
      const reportSection = new Section(
        section.id,
        this.page.config,
        this.config,
        this.filters,
        this.allData
      );
      this.sections[section.id] = reportSection;
    });
  }

  // Restore any subcategory dropdown selectors based on URL parameters
  bindSubcategoryListener() {
    const dropdowns = document.querySelectorAll('.subcategory-selector');

    dropdowns.forEach(dropdown => {
      const param = dropdown.dataset.param;
      if (param) {
        const urlVal = UrlUtils.get(param);
        if (urlVal) {
          const optionExists = Array.from(dropdown.options).some(opt => opt.value === urlVal);
          if (optionExists) {
            dropdown.value = urlVal;
          }
        }
      }
    });
  }

  // Watch for changes in the client dropdown
  bindClientListener() {
    const selects = document.querySelectorAll('select[name="client-breakdown"], #client-breakdown, #comparison-client-breakdown');

    // Restore client from URL param on page load
    const clientParam = UrlUtils.get('client');
    const selectedClient = clientParam || (selects[0] ? selects[0].value : 'mobile');

    if (this.filters) {
      this.filters.client = selectedClient;
    }

    selects.forEach(select => {
      select.value = selectedClient;
      select.onchange = (event) => this.updateClient(event);
    });

    document.querySelectorAll('[data-client]').forEach(component => {
      component.dataset.client = selectedClient;
    });
    document.querySelectorAll('[data-slot="client"]').forEach(component => {
      component.innerText = UIUtils.capitalizeFirstLetter(selectedClient);
    });
  }

  // Watch for changes in the accessibility/UI settings
  bindSettingsListeners() {
    const indicatorSetting = document.querySelector('input[name="indicators-check"]');
    if(indicatorSetting) {
      indicatorSetting.onchange = (event) => {
        document.querySelector('main').dataset.showIndicators = event.target.checked;
        localStorage.setItem('showIndicators', event.target.checked);

        Object.values(this.sections).forEach(section => {
          section.updateSection();
        });

      }
    }

    const themeSwitcher = document.querySelector('button.theme-switcher');
    if(themeSwitcher) {
      themeSwitcher.addEventListener('click', (event) => {
        const currentTheme = document.querySelector('html').dataset.theme;

        if(currentTheme !== 'dark') {
          document.querySelector('html').dataset.theme = 'dark';
          localStorage.setItem('haTheme', 'dark');
          event.target.innerHTML = '🌝 Switch to light theme';
        } else {
          document.querySelector('html').dataset.theme = 'light';
          localStorage.setItem('haTheme', 'light');
          event.target.innerHTML = '🌚 Switch to dark theme';
        }
      });
    }
  }

  // Update which client is selected
  updateClient(event) {
    const client = event.target.value;
    if (this.filters) {
      this.filters.client = client;
    }

    // Update the URL
    const url = new URL(window.location.href);
    url.searchParams.set(`client`, client);
    window.history.replaceState(null, null, url);

    // Keep all client dropdowns in sync (if multiple)
    const selects = document.querySelectorAll('select[name="client-breakdown"], #client-breakdown, #comparison-client-breakdown');
    selects.forEach(select => {
      if (select.value !== client) {
        select.value = client;
      }
    });

    // Update selected client property everywhere
    document.querySelectorAll('[data-client]').forEach(component => {
      component.dataset.client = client;
    });

    // Update the sections
    Object.values(this.sections).forEach(section => {
      if (section.pageFilters) {
        section.pageFilters.client = client;
      }
      section.updateSection();
    });

    // Update labels
    DrilldownHeader.updateFilterMeta(this.filters);
  }

  // New API
  async getAllMetricData() {
    const technologies = this.filters && this.filters.app;

    if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
      return;
    }

    const allResults = await DataUtils.fetchMetricsForTechnologies({
      technologies,
      geo: this.filters.geo,
      rank: this.filters.rank,
      start: this.filters.start,
      end: this.filters.end,
    });

    this.updateComponents(allResults);
  }

  getCategoryData() {
    const callback = this.updateCategoryComponents.bind(this);
    DataUtils.fetchCategoryData(this.filters.rows, this.filters, callback)
  }

  // Get the information about the selected technology
  getTechInfo() {
    const technologies = this.filters.app;
    const technology = technologies.map(encodeURIComponent).join(',');

    if (technology === 'ALL') {
      return;
    }

    const url = `${Constants.apiBase}/technologies?technology=${technology}`;

    fetch(url)
      .then(result => result.json())
      .then(result => {
        const techInfo = result[0];

        const categoryListEl = document.getElementsByClassName('category-list')[0];
        categoryListEl.innerHTML = '';

        const categories = techInfo && techInfo.category ? techInfo.category.split(', ') : [];
        DrilldownHeader.setCategories(categories);
        DrilldownHeader.setDescription(techInfo.description);
        if (techInfo.icon) {
          DrilldownHeader.setIcon(techInfo.icon);
        }
      });
  }

  updateCategoryComponents (category) {
    this.updateComponents(category.data);
    DrilldownHeader.setDescription(category.description);
    const mainTitle = document.querySelector('h1 span.main-title');
    if (mainTitle && this.filters.category) {
      mainTitle.textContent = this.filters.category;
    }
  }

  // Update components and sections that are relevant to the current page
  updateComponents(data) {
    switch(this.pageId) {
      case 'landing':
        this.updateLandingComponents(data);
        break;

      case 'drilldown':
        this.updateDrilldownComponents(data);
        this.getFilterInfo();
        break;

      case 'comparison':
        this.updateComparisonComponents(data);
        this.getFilterInfo();
        DrilldownHeader.updateFilterMeta(this.filters);
        break;

      case 'category':
        this.updateComparisonComponents(data);
        this.getFilterInfo();
        DrilldownHeader.updateFilterMeta(this.filters);
        break;
    }
  }

  // Fetch the data for the filter dropdowns
  getFilterInfo() {
    const filterData = {};

    const filterApis = [
      {
        name: 'categories',
        endpoint: 'categories?onlyname',
      },
      {
        name: 'technologies',
        endpoint: 'technologies?fields=technology,icon',
      },
      {
        name: 'ranks',
        endpoint: 'ranks',
      },
      {
        name: 'geos',
        endpoint: 'geos',
      },
    ];

    const filters = document.querySelectorAll('.filters select');
    Promise.all(filterApis.map(api => {
      const url = `${Constants.apiBase}/${api.endpoint}`;

      return fetch(url)
        .then(result => result.json())
        .then(result => filterData[api.name] = result)
        .catch(error => console.log('Something went wrong', error));
    })).then(() => {
      const FilterComponent = new Filters(filterData, this.filters);

      FilterComponent.updateCategories();
      FilterComponent.updateTechnologies();
      FilterComponent.updateRank();
      FilterComponent.updateGeo();

      filters.forEach(filter => filter.removeAttribute('disabled'));
    });
  }

  // Update the page components
  updateLandingComponents(data) {
    const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');
    allDataComponents.forEach((component) => {
      component.allData = data;
      component.page = this.page;
      component.labels = this.labels;
      component.setAttribute('loaded', true);
      component.setAttribute('all_data', JSON.stringify(data));
    });
  }

  // Update drilldown page components
  updateDrilldownComponents(data) {
    const app = this.filters.app[0];
    const icon = data[app]?.at(-1)?.icon;
    DrilldownHeader.update(this.filters);
    if (icon) {
      DrilldownHeader.setIcon(`${encodeURI(icon)}`);
    }

    if(data && data[app]) {
      UIUtils.updateReportComponents(this.sections, data, data[app], this.page, this.labels);
    } else {
      this.updateWithEmptyData();
    }
  }

  // Update comparison components
  updateComparisonComponents(data) {
    if(data && Object.keys(data).length > 0) {
      UIUtils.updateReportComponents(this.sections, data);
    } else {
      this.updateWithEmptyData();
    }
  }

  // Add error message if no data was found
  updateWithEmptyData() {
    const text = document.createElement('p');
    text.textContent = 'No data found for this query';
    text.className = 'error';

    const report = document.getElementById('report-content');
    report.innerHTML = '';
    report.append(text);
  }

  // Add styling based on config
  updateStyling() {
    const series = this.page.config.default.series;
    const body = document.querySelector('body');
    if(series?.breakdown == 'client') {
      series?.breakdown_values?.forEach((breakdown) => {
        body.style.setProperty(`--breakdown-color-${breakdown.name}`, breakdown.color);
      });
    }
  }

  /**
   * Bootstraps the TechReport client-side from the #techreport-data container.
   * Parses URL query parameters, configures filters, toggles views if polymorphic,
   * updates initial headers, populates crawl date dropdowns, and initializes TechReport.
   */
  static async boot(containerId = 'techreport-data') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const fullConfig = JSON.parse(container.dataset.fullConfig || '{}');
    const labels = JSON.parse(container.dataset.labels || '{}');
    const pages = container.dataset.pages ? JSON.parse(container.dataset.pages) : null;
    let pageId = container.dataset.pageId;
    let pageConfig = container.dataset.pageConfig ? JSON.parse(container.dataset.pageConfig) : null;

    // Handle landing page directly
    if (pageId === 'landing') {
      return new TechReport('landing', pageConfig, fullConfig, labels);
    }

    // Resolve polymorphic route (/reports/techreport/tech)
    if (!pageId || pageId === 'tech') {
      const techParam = UrlUtils.get('tech', 'ALL');
      const techs = techParam.split(',').map(t => t.trim()).filter(Boolean);
      pageId = techs.length > 1 ? 'comparison' : 'drilldown';
      if (pages) {
        pageConfig = pages[pageId];
      }
    }

    if (!pageConfig && pages && pages[pageId]) {
      pageConfig = pages[pageId];
    }

    if (!pageConfig) {
      console.error(`TechReport.boot: unable to resolve page config for "${pageId}"`);
      return null;
    }

    // Toggle polymorphic layouts if both exist in DOM (tech.astro)
    const compView = document.getElementById('comparison-view');
    const drillView = document.getElementById('drilldown-view');
    if (compView && drillView) {
      if (pageId === 'comparison') {
        compView.id = 'report-content';
        compView.classList.remove('hidden');
        drillView.remove();
      } else {
        drillView.id = 'report-content';
        drillView.classList.remove('hidden');
        compView.remove();
      }
    }

    // Extract query parameters and filters
    const filters = UrlUtils.getFilters(pageConfig);
    const requestedTechs = filters.app;

    const params = {
      geo: filters.geo,
      rank: filters.rank,
      client: filters.client,
    };

    pageConfig.filters = filters;
    pageConfig.params = params;

    // Immediately set titles & summary counts before async fetches
    if (pageId === 'comparison') {
      const count = requestedTechs.length;
      const techWord = count === 1 ? 'technology' : 'technologies';
      const titleEl = document.querySelector('h1 span.main-title');
      if (titleEl) {
        titleEl.textContent = `Compare ${count} ${techWord}`;
      }
      const summaryCountEl = document.querySelector('[data-slot="techs-count"]');
      if (summaryCountEl) {
        summaryCountEl.textContent = `${count} ${techWord}`;
      }
    } else if (pageId === 'drilldown') {
      const titleEl = document.querySelector('h1 span.main-title');
      if (titleEl && requestedTechs[0]) {
        titleEl.textContent = requestedTechs[0] === 'ALL' ? 'All technologies' : requestedTechs[0];
      }
    } else if (pageId === 'category') {
      const titleEl = document.querySelector('h1 span.main-title');
      if (titleEl && filters.category) {
        titleEl.textContent = filters.category;
      }
    }

    // Fetch crawl dates and populate start/end date selectors
    let dates = [];
    try {
      const resp = await fetch(`${Constants.apiBase}/dates`);
      if (resp.ok) {
        const data = await resp.json();
        dates = data.dates || [];
      } else {
        console.warn(`Failed to fetch dates: ${resp.status}`);
      }
    } catch (e) {
      console.error('Failed to fetch dates', e);
    }

    const startSelect = document.getElementById('startDate');
    const endSelect = document.getElementById('endDate');
    if (startSelect && endSelect) {
      const startVal = filters.start || '';
      const endVal = filters.end || '';

      dates.forEach(d => {
        const formattedDate = d.replace(/_/g, '-');
        const parts = d.split('_');
        const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1));
        const display = dateObj.toLocaleString('default', { month: 'short', year: 'numeric', timeZone: 'UTC' });

        const opt1 = document.createElement('option');
        opt1.value = formattedDate;
        opt1.textContent = display;
        if (formattedDate === startVal) opt1.selected = true;
        startSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = formattedDate;
        opt2.textContent = display;
        if (formattedDate === endVal) opt2.selected = true;
        endSelect.appendChild(opt2);
      });
    }

    return new TechReport(pageId, pageConfig, fullConfig, labels);
  }

  /**
   * Safe launcher that waits for DOM readiness if necessary.
   */
  static start(containerId = 'techreport-data') {
    if (document.readyState === 'loading') {
      return new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', () => {
          resolve(TechReport.boot(containerId));
        });
      });
    }
    return TechReport.boot(containerId);
  }
}

window.TechReport = TechReport;
export default TechReport;
export { TechReport };
