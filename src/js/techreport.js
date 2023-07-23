const { DrilldownHeader } = require("./components/drilldownHeader");
const { Filters } = require("./components/filters");
const { getPercentage } = require("./utils");

class TechReport {
  constructor(pageId, page, config, labels) {
    this.filters = page.filters;
    this.allData = [];
    this.page = page;
    this.config = config;
    this.labels = labels;
    this.pageId = pageId;

    this.bindClientListener();
    this.getAllData();
  }

  bindClientListener() {
    const select = document.getElementById('client-breakdown');
    if(select) {
      select.onchange = (event) => {
      const client = event.target.value;
      const allDataComponents = document.querySelectorAll('[data-scope]');
        allDataComponents.forEach(component => {
          component.setAttribute('client', client);
        });
    }
    }
  }

  processData(result) {
    return result.map(entry => {
      entry.pct_good_cwv = getPercentage(entry.origins_with_good_cwv, entry.origins_eligible_for_cwv);
      this.config.cwv_subcategories.forEach(cwv => {
        entry[`origins_eligible_for_${cwv}`] = entry[`origins_with_any_${cwv}`];
        entry[`pct_good_${cwv}`] = getPercentage(entry[`origins_with_good_${cwv}`], entry[`origins_with_any_${cwv}`]);
      });

      this.config.lighthouse_subcategories.forEach(metric => {
        entry[`median_lighthouse_score_${metric}`] = parseInt(entry[`median_lighthouse_score_${metric}`] * 100);
      })
      return entry;
    });
  }

  getAllData() {
    const data = {};
    const fetch_app = this.filters.app.concat(this.filters.app_defaults);
    Promise.all(fetch_app.map(technology => {
      const url = `https://cdn.httparchive.org/reports/cwvtech/${this.filters.rank}/${this.filters.geo}/${technology}.json`;
      return fetch(url)
        .then(result => result.json())
        .then(result => this.processData(result))
        .then(result => {
          data[technology] = result;
        });
    })).then(() => {
      this.updateComponents(data);
    });
  }

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
  }

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
  }


  updateComparisonComponents(data) {
    const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');

    allDataComponents.forEach((component) => {
      component.allData = data;
      component.page = this.page;
      component.labels = this.labels;
      component.setAttribute('loaded', true);
      component.setAttribute('all_data', JSON.stringify(data));
    });
  }
}

window.TechReport = TechReport;
