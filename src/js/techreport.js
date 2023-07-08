class TechReport {
  constructor(report) {
    console.log('TechReport', report);
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
    });;
  }

  updateComponents(data) {
    const generalComponents = document.querySelectorAll('[data-scope="general-info"]');
    generalComponents.forEach((component) => {
      const app = this.filters.app.join(',');

      component.categories = data[0][0]?.category?.split(",");
      component.app = app;
      component.filters = this.filters;
      component.filters.appString = this.filters.app.join(',');

      component.setAttribute('loaded', true);
    });

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
