/* global Section */

import Filters from '../components/filters';
import { Constants } from './utils/constants';
import { DrilldownHeader } from "../components/drilldownHeader";
import { DataUtils } from "./utils/data";
import { UIUtils } from "./utils/ui";

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
    const urlParams = new URLSearchParams(window.location.search);

    dropdowns.forEach(dropdown => {
      const param = dropdown.dataset.param;
      if (param) {
        const urlVal = urlParams.get(param);
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
    const urlParams = new URLSearchParams(window.location.search);
    const clientParam = urlParams.get('client');
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
  getAllMetricData() {
    const technologies = this.filters && this.filters.app;

    if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
      return;
    }

    const apis = [
      {
        endpoint: 'technologies',
        metric: 'technologies',
      },
      {
        endpoint: 'cwv',
        metric: 'vitals',
        parse: DataUtils.parseVitalsData,
      },
      {
        endpoint: 'lighthouse',
        metric: 'lighthouse',
        parse: DataUtils.parseLighthouseData,
      },
      {
        endpoint: 'adoption',
        metric: 'adoption',
        parse: DataUtils.parseAdoptionData,
      },
      {
        endpoint: 'page-weight',
        metric: 'pageWeight',
        parse: DataUtils.parsePageWeightData,
      },
    ];

    const technology = technologies.join('%2C')
      .replaceAll(" ", "%20");

    const geo = this.filters.geo.replaceAll(" ", "%20");
    const rank = this.filters.rank.replaceAll(" ", "%20");
    const start = this.filters.start;
    const end = this.filters.end;

    let allResults = {};
    let techInfo = {};
    technologies.forEach(tech => allResults[tech] = []);

    Promise.all(apis.map(api => {
      let url = `${Constants.apiBase}/${api.endpoint}?technology=${technology}&geo=${geo}&rank=${rank}`;
      if (start) {
        url += `&start=${start}`;
      }
      if (end) {
        url += `&end=${end}`;
      }

      return fetch(url)
        .then(result => result.json())
        .then(result => {
          const sortedResult = result.sort((a, b) => new Date(a.date) - new Date(b.date));
          let previousRow = {};
          // Loop through all the rows of the API result
          sortedResult.forEach(row => {
            const parsedRow = {
              ...row,
            }

            // Parse the data and add it to the results
            if(api.parse) {
              const metric = parsedRow[api.metric] || parsedRow;
              const previousMetric = previousRow[row.technology]?.[api.metric];
              parsedRow[api.metric] = api.parse(metric, previousMetric, parsedRow?.date);
            }

            if(api.endpoint === 'technologies') {
              techInfo[row.technology] = row;
            } else {
              const resIndex = allResults[row.technology].findIndex(res => res.date === row.date);
              if(resIndex > -1) {
                allResults[row.technology][resIndex] = {
                  ...allResults[row.technology][resIndex],
                  ...techInfo[row.technology],
                  ...parsedRow
                }
              } else {
                allResults[row.technology].push(parsedRow);
              }
            }

            previousRow[row.technology] = row;
          });
        })
        .catch(error => console.log('Something went wrong', error));
    })).then(() => {
      // Ensure techInfo properties (such as icon) are merged into allResults even if technologies finishes later
      Object.keys(techInfo).forEach(tech => {
        if (allResults[tech]?.length) {
          allResults[tech].forEach(row => {
            Object.assign(row, techInfo[tech]);
          });
        }
      });
      this.updateComponents(allResults);
    });
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
}

window.TechReport = TechReport;
