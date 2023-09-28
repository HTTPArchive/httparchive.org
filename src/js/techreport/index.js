const { DrilldownHeader } = require("../components/drilldownHeader");
const { Filters } = require("../components/filters");
const { getPercentage } = require("../utils");

class TechReport {
  constructor(pageId, page, config, labels) {
    this.filters = page.filters;
    this.allData = [];
    this.page = page;
    this.config = config;
    this.labels = labels;
    this.pageId = pageId;
    this.sections = {};

    // Load the page
    this.initializePage();
    this.getAllData();
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
    })

  }

  // Fetch all the data based on search criteria and config
  // TODO: Will be moved to the section level with new APIs
  getAllData() {
    const data = {};
    const fetch_app = this.filters.app.concat(this.filters.app_defaults);

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
