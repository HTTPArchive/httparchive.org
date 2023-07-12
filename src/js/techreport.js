const { DrilldownHeader } = require("./components/drilldownHeader");
const { Filters } = require("./components/filters");
const { getPercentage } = require("./utils");

class TechReport {
  constructor(report, config, labels) {
    this.filters = report.set_filters;
    this.allData = [];
    this.config = config;
    this.labels = labels;
    this.getAllData();
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
    const data = [];
    this.filters.app.forEach(technology => {
      const url = `https://cdn.httparchive.org/reports/cwvtech/${this.filters.rank}/${this.filters.geo}/${technology}.json`;
      fetch(url)
        .then(result => result.json())
        .then(result => this.processData(result))
        .then(result => {
          data.push(result);
          this.updateComponents(data);
        });
    });

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
    DrilldownHeader.update(data, this.filters)

    const latestComponents = document.querySelectorAll('[data-scope="all-latest"]');
    latestComponents.forEach((component) => {
      component.latest = data[0][0];
      component.labels = this.labels;
      component.setAttribute('loaded', true);
    });

    const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');
    allDataComponents.forEach((component) => {
      component.allData = data[0];
      component.labels = this.labels;
      component.setAttribute('loaded', true);
    })
  }
}

window.TechReport = TechReport;
