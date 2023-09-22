class Section {
  constructor(id, config, filters, data) {
    this.id = id;
    this.data = data;
    this.pageConfig = config;
    this.pageFilters = filters;
    this.timeseries = {};

    this.initializeComponents();
  }

  initializeComponents() {
    const section = document.getElementById(this.id);
    const timeseriesComponents = section.querySelectorAll('[data-component="timeseries"]');
    Object.values(timeseriesComponents).forEach(component => {
      this.timeseries[component.dataset.id] = new Timeseries(
        component.dataset.id,
        this.pageConfig,
        this.pageFilters,
        this.data
      );
    });
  }

  updateSection() {
    Object.values(this.timeseries).forEach(component => {
      component.data = this.data;
      component.updateContent();
    });
  }
}

window.Section = Section;
