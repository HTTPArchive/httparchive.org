import Filters from '../components/filters';
import { Constants } from './utils/constants';
const { DrilldownHeader } = require("../components/drilldownHeader");
const { DataUtils } = require("./utils/data");
const { UIUtils } = require("./utils/ui");

class TechReport {
  constructor(pageId, page, config, labels) {
    this.filters = page.filters;
    this.allData = [];
    this.config = config;
    this.labels = labels;
    this.pageId = pageId;
    this.sections = {};

    // Pass the labels into the page data
    this.page = {
      ...page,
      config: {
        ...page.config,
        labels: labels,
      },
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
        mobileFilters.innerHTML = reportFilters.innerHTML;
        mobileFilters.classList.remove('hidden');
        document.getElementById('close-filters').classList.remove('hidden');
        openButtonMobile.setAttribute('aria-expanded', true);
      } else {
        mobileFilters.innerHTML = '';
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

      case 'category':
        const category = this.filters.category || 'CMS';
        this.initializeReport();
        this.getCategoryData(category);
        break;
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

    // Apply settings and watch for updates
    this.bindClientListener();
  }

  // Watch for changes in the client dropdown
  bindClientListener() {
    const select = document.getElementById('client-breakdown');

    if(select) {
      select.onchange = (event) => this.updateClient(event);
    }
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

    // Update the URL
    const url = new URL(window.location.href);
    url.searchParams.set(`client`, client);
    window.history.replaceState(null, null, url);

    // Update selected client property everywhere
    document.querySelectorAll('[data-client]').forEach(component => {
      component.dataset.client = client;
    });

    // Update the sections
    Object.values(this.sections).forEach(section => {
      section.updateSection();
    });

    // Update labels
    document.querySelectorAll('[data-slot="client"]').forEach(component => {
      component.innerHTML = client;
    });
  }

  // New API
  getAllMetricData() {
    const technologies = this.filters.app;

    const apis = [
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

    let allResults = {};
    technologies.forEach(tech => allResults[tech] = []);

    Promise.all(apis.map(api => {
      const url = `${Constants.apiBase}/${api.endpoint}?technology=${technology}&geo=${geo}&rank=${rank}`;

      return fetch(url)
        .then(result => result.json())
        .then(result => {
          // Loop through all the rows of the API result
          result.forEach(row => {
            const parsedRow = {
              ...row,
            }

            // Parse the data and add it to the results
            if(api.parse) {
              const metric = parsedRow[api.metric] || parsedRow;
              parsedRow[api.metric] = api.parse(metric, parsedRow?.date);
            }

            const resIndex = allResults[row.technology].findIndex(res => res.date === row.date);
            if(resIndex > -1) {
              allResults[row.technology][resIndex] = {
                ...allResults[row.technology][resIndex],
                ...parsedRow
              }
            } else {
              allResults[row.technology].push(parsedRow);
            }
          });
        })
        .catch(error => console.log('Something went wrong', error));
    })).then(() => {
      this.updateComponents(allResults);
    });
  }

  getCategoryData(category) {
    const url = `${Constants.apiBase}/categories?category=${category}`;
    const apis = [
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

    fetch(url)
      .then(result => result.json())
      .then(result => {
        const category = result[0];
        const technologyFormatted = category?.technologies?.join('%2C')
          .replaceAll(" ", "%20");

          const geo = this.filters.geo.replaceAll(" ", "%20");
          const rank = this.filters.rank.replaceAll(" ", "%20");
          const geoFormatted = geo.replaceAll(" ", "%20");
          const rankFormatted = rank.replaceAll(" ", "%20");

          let allResults = {};
          category.technologies.forEach(tech => allResults[tech] = []);

          Promise.all(apis.map(api => {
            const url = `${Constants.apiBase}/${api.endpoint}?technology=${technologyFormatted}&geo=${geoFormatted}&rank=${rankFormatted}&start=latest`;

            return fetch(url)
              .then(techResult => techResult.json())
              .then(techResult => {
                techResult.forEach(row => {
                  const parsedRow = {
                    ...row,
                  }

                  if(api.parse) {
                    parsedRow[api.metric] = api.parse(parsedRow[api.metric], parsedRow?.date);
                  }

                  const resIndex = allResults[row.technology].findIndex(res => res.date === row.date);
                  if(resIndex > -1) {
                    allResults[row.technology][resIndex] = {
                      ...allResults[row.technology][resIndex],
                      ...parsedRow
                    }
                  } else {
                    allResults[row.technology].push(parsedRow);
                  }
                });
              });
          })).then(() => {
            category.data = {
              technologies: allResults,
              info: {
                origins: category.origins,
                technologies: Object.keys(allResults).length,
              },
            };
            this.updateCategoryComponents(category);
          });
      });
  }

  // Get the information about the selected technology
  getTechInfo() {
    const technologies = this.filters.app;
    const technology = technologies.join('%2C')
      .replaceAll(" ", "%20");

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
      });
  }

  updateCategoryComponents (category) {
    this.updateComponents(category.data);
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
        break;

      case 'category':
        this.updateComparisonComponents(data);
        this.getFilterInfo();
        break;
    }
  }

  // Fetch the data for the filter dropdowns
  getFilterInfo() {
    const filterData = {};

    const filterApis = ['categories', 'technologies', 'ranks', 'geos'];

    Promise.all(filterApis.map(api => {
      const url = `${Constants.apiBase}/${api}`;

      return fetch(url)
        .then(result => result.json())
        .then(result => filterData[api] = result)
        .catch(error => console.log('Something went wrong', error));
    })).then(() => {
      const FilterComponent = new Filters(filterData, this.filters);

      FilterComponent.updateCategories();
      FilterComponent.updateTechnologies();
      FilterComponent.updateRank();
      FilterComponent.updateGeo();
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
    DrilldownHeader.update(this.filters);

    const app = this.filters.app[0];

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
