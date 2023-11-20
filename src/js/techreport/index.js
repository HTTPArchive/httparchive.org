const { DrilldownHeader } = require("../components/drilldownHeader");
const { Filters } = require("../components/filters");
const { getPercentage } = require("../utils");

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
      }
    };

    // Load the page
    this.initializePage();
    // this.getFilterInfo();
    this.getAllMetricData();
    this.bindSettingsListeners();
  }

  // Initialize the sections for the different pages
  initializePage() {
    switch(this.pageId) {
      case 'landing':
        this.initializeLanding();
        break;

      case 'drilldown':
        this.initializeReport();
        break;

      case 'comparison':
        this.initializeReport();
        break;
    }
  }

  // TODO
  initializeLanding() {
  }

  // TODO
  initializeReport() {
    Filters.bindFilterListener();

    // TODO: Move to function
    const showIndicators = localStorage.getItem('showIndicators');
    document.querySelector('main').dataset.showIndicators = showIndicators;
    document.querySelector('#indicators-check').checked = showIndicators === 'true';

    // TODO: Move to function
    const theme = localStorage.getItem('haTheme');
    document.querySelector('html').dataset.theme = theme;
    const btn = document.querySelector('.theme-switcher');
    if(theme === 'dark') {
      btn.innerHTML = '🌝 Switch to light theme';
    } else if(theme === 'light') {
      btn.innerHTML = '🌚 Switch to dark theme';
    }

    const sections = document.querySelectorAll('[data-type="section"]');
    // TODO: add general config too
    sections.forEach(section => {
      const reportSection = new Section(
        section.id,
        this.page.config,
        this.filters,
        this.allData
      );
      this.sections[section.id] = reportSection;
    });

    this.bindClientListener();
    this.updateStyling();
  }

  // Watch for changes in the client dropdown
  bindClientListener() {
    const select = document.getElementById('client-breakdown');

    if(select) {
      select.onchange = (event) => this.updateClient(event);
    }
  }

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

  parseVitalsData(metric) {
    return metric.map(submetric => {
      return {
        ...submetric,
        desktop: {
          ...submetric.desktop,
          good_pct: submetric.desktop.tested > 0 ? parseInt(submetric.desktop.good_number / submetric.desktop.tested * 100) : 0,
        },
        mobile: {
          ...submetric.mobile,
          good_pct: submetric.mobile.tested > 0 ? parseInt(submetric.mobile.good_number / submetric.mobile.tested * 100) : 0,
        },
      };
    });
  }

  parseLighthouseData(metric) {
    return metric.map(submetric => {
      return {
        ...submetric,
        desktop: {
          ...submetric.desktop,
          median_score_pct: parseInt(submetric.desktop.median_score * 100),
        },
        mobile: {
          ...submetric.mobile,
          median_score_pct: parseInt(submetric.mobile.median_score * 100),
        },
      };
    });
  }

  parseAdoptionData(submetric) {
    return [
      {
        desktop: {
          origins: submetric.desktop,
        },
        mobile: {
          origins: submetric.mobile,
        },
        name: 'adoption',
      },
    ];
  }

  // Fetch all the data based on search criteria and config
  // TODO: Will be moved to the section level with new APIs
  getAllData() {
    const data = {};
    const technologies = this.filters.app;

    /* Make a request for each of the technologies and return them in an object.
     * Once we port this over to the new APIs, this should be moved to the section level.
     */
    Promise.all(technologies.map(technology => {
      const url = `https://cdn.httparchive.org/reports/cwvtech/${this.filters.rank}/${this.filters.geo}/${technology}.json`;
      return fetch(url)
        .then(result => result.json())
        .then(result => this.processData(result))
        .then(result => {
          data[technology] = result;
        })
        .catch(error => console.log('Something went wrong', error));
    })).then(() => {
      this.allData = data;
      this.updateComponents(data);
    });
  }

  // New API
  getAllMetricData() {
    const data = {};
    const technologies = this.filters.app;

    const apis = [
      {
        endpoint: 'cwv',
        metric: 'vitals',
        parse: this.parseVitalsData,
      },
      {
        endpoint: 'lighthouse',
        metric: 'lighthouse',
        parse: this.parseLighthouseData,
      },
      {
        endpoint: 'adoption',
        metric: 'adoption',
        parse: this.parseAdoptionData,
      },
      {
        endpoint: 'page-weight',
        metric: 'page-weight'
      },
    ];

    const base = 'https://dev-gw-2vzgiib6.ue.gateway.dev/v1';

    const technology = technologies.join('%2C');

    let allResults = {};
    technologies.forEach(tech => allResults[tech] = []);

    Promise.all(apis.map(api => {
      const url = `${base}/${api.endpoint}?technology=${technology}&geo=${this.filters.geo}&rank=${this.filters.rank}`;

      return fetch(url)
        .then(result => result.json())
        .then(result => {
          result.forEach(row => {
            const parsedRow = {
              ...row,
            }

            if(api.parse) {
              parsedRow[api.metric] = api.parse(parsedRow[api.metric]);
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

  // Change data format from API data to what we need
  // TODO: Will be moved to the section level with new APIs
  processData(result) {
    return result.map(entry => {
      /* Calculate percentage of good core web vitals */
      entry.pct_good_cwv = getPercentage(entry.origins_with_good_cwv, entry.origins_eligible_for_cwv);
      this.config.cwv_subcategories.forEach(cwv => {
        entry[`origins_eligible_for_${cwv}`] = entry[`origins_with_any_${cwv}`];
        entry[`pct_good_${cwv}`] = getPercentage(entry[`origins_with_good_${cwv}`], entry[`origins_with_any_${cwv}`]);
      });

      // Turn the LH score from a decimal to an int
      this.config.lighthouse_subcategories.forEach(metric => {
        entry[`median_lighthouse_score_${metric}`] = parseInt(entry[`median_lighthouse_score_${metric}`] * 100);
      })

      return entry;
    });
  }

  // Update components and sections that are relevant to the current page
  // TODO: After moving to new APIs data won't have to be passed in like this anymore
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
    }
  }

  // Fetch the data for the filter dropdowns
  getFilterInfo() {
    fetch('https://cdn.httparchive.org/reports/cwvtech/technologies.json')
      .then(result => result.json())
      .then(result => Filters.updateTechnologies(result, this.filters));

    fetch('https://cdn.httparchive.org/reports/cwvtech/geos.json')
      .then(result => result.json())
      .then(result => Filters.updateGeo(result, this.filters));

    fetch('https://cdn.httparchive.org/reports/cwvtech/ranks.json')
      .then(result => result.json())
      .then(result => Filters.updateRank(result, this.filters));

    fetch('https://cdn.httparchive.org/reports/cwvtech/categories.json')
      .then(result => result.json())
      .then(result => Filters.updateCategories(result, this.filters));
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

  updateDrilldownComponents(data) {
    DrilldownHeader.update(data, this.filters);

    const app = this.filters.app[0];

    if(data && data[app]) {
      // Update sections
      Object.values(this.sections).forEach(section => {
        section.data = data;
        section.updateSection();
      });

      // Update web components
      // TODO: Change to same system as sections/timeseries
      const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');
      allDataComponents.forEach((component) => {
        component.allData = data[app];
        component.labels = this.labels;
        component.setAttribute('loaded', true);
      });
    } else {
      this.updateWithEmptyData();
    }
  }

  updateComparisonComponents(data) {
    if(data && Object.keys(data).length > 0) {
      // TODO: this doesn't have to be diff for landing / comp / drilldown
      // Update sections
      Object.values(this.sections).forEach(section => {
        section.data = data;
        section.updateSection();
      });

      const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');

      allDataComponents.forEach((component) => {
        component.allData = data;
        component.page = this.page;
        component.labels = this.labels;
        component.setAttribute('loaded', true);
        component.setAttribute('all_data', JSON.stringify(data));
      });
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
