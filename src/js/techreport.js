const { DrilldownHeader } = require("./components/drilldownHeader");
const { Filters } = require("./components/filters");
const { Sections } = require("./techreport/sections");
const { Timeseries } = require("./techreport/timeseries");
const { getPercentage } = require("./utils");

class TechReport {
  constructor(pageId, page, config, labels) {
    this.filters = page.filters;
    this.allData = [];
    this.page = page;
    this.config = config;
    this.labels = labels;
    this.pageId = pageId;

    /* Fetch the data */
    this.getAllData();

    /* Initiate components */
    if(pageId === 'drilldown' || pageId === 'comparison') {
        Filters.bindFilterListener();
        // Timeseries.init(this.page, this.filters);
        Sections.init(this.page, this.filters);
        this.bindClientListener();
        this.updateStyling();
    }
  }

  /* Watch for changes in the client dropdown */
  bindClientListener() {
    const select = document.getElementById('client-breakdown');
    const allDataComponents = document.querySelectorAll('[data-scope]');

    if(select) {
      select.onchange = (event) => {
        const client = event.target.value;

        allDataComponents.forEach(component => {
          component.setAttribute('client', client);
        });

        this.filters = {
          ...this.filters,
          client: client
        };

        // Timeseries.updateFilters(this.page.config, this.filters, this.allData);

        const url = new URL(window.location.href);
        url.searchParams.set(`client`, client);
        window.history.replaceState(null, null, url);
      }
    }
  }

  /* Fetch all the data for this report */
  getAllData() {
    const data = {};
    const fetch_app = this.filters.app.concat(this.filters.app_defaults);
    console.log('fetch_app', fetch_app);

    /* Make a request for each of the technologies and return them in an object.
     * Once we port this over to the new APIs, this should be moved to the section level.
     */
    Promise.all(fetch_app.map(technology => {
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

  /* Change format from API data to what we need */
  processData(result) {
    return result.map(entry => {
      /* Calculate percentage of good core web vitals */
      entry.pct_good_cwv = getPercentage(entry.origins_with_good_cwv, entry.origins_eligible_for_cwv);
      this.config.cwv_subcategories.forEach(cwv => {
        entry[`origins_eligible_for_${cwv}`] = entry[`origins_with_any_${cwv}`];
        entry[`pct_good_${cwv}`] = getPercentage(entry[`origins_with_good_${cwv}`], entry[`origins_with_any_${cwv}`]);
      });

      /* Turn the LH score from a decimal to an int
       * If this is changed in the new APIs then we can remove this
       */
      this.config.lighthouse_subcategories.forEach(metric => {
        entry[`median_lighthouse_score_${metric}`] = parseInt(entry[`median_lighthouse_score_${metric}`] * 100);
      })

      return entry;
    });
  }

  /* Update components that are relevant to the current page */
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

  /* Fetch the data for the filter dropdowns */
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
    Sections.updateSectionWithData('', data);

    const app = this.filters.app[0];

    if(data && data[app]) {
      // Timeseries.updateData(this.page.config, this.filters, data);

      /* Update web components */
      const latestComponents = document.querySelectorAll('[data-scope="all-latest"]');
      latestComponents.forEach((component) => {
        component.latest = data[app][0];
        component.labels = this.labels;
        component.setAttribute('loaded', true);
      });

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

  updateWithEmptyData() {
    const text = document.createElement('p');
    text.textContent = 'No data found for this query';
    text.className = 'error';

    const report = document.getElementById('report-content');
    report.innerHTML = '';
    report.append(text);
  }

  updateStyling() {
    const series = this.page.config.default.series;
    const body = document.querySelector('body');
    if(series.breakdown == 'client') {
      series.breakdown_values.forEach((breakdown) => {
        body.style.setProperty(`--breakdown-color-${breakdown.name}`, breakdown.color);
      });
    }
  }
}

window.TechReport = TechReport;
