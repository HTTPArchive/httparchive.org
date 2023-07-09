const { DrilldownHeader } = require("./components/drilldownHeader");
const { Filters } = require("./components/filters");

class TechReport {
  constructor(report) {
    this.filters = report.set_filters;
    this.allData = [];
    this.getAllData();
  }

  getAllData() {
    const data = [];
    this.filters.app.forEach(async (technology) => {
      const url = `https://cdn.httparchive.org/reports/cwvtech/${this.filters.rank}/${this.filters.geo}/${technology}.json`;
      await fetch(url)
        .then(result => result.json())
        .then((result) => {
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
      component.setAttribute('loaded', true);
    });

    const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');
    allDataComponents.forEach((component) => {
      component.allData = data[0];
      component.setAttribute('loaded', true);
    })
  }
}

window.TechReport = TechReport;
