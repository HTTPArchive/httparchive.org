import SummaryCard from "./summaryCards";

class Section {
  constructor(id, config, filters, data) {
    this.id = id;
    this.data = data;
    this.pageConfig = config;
    this.pageFilters = filters;
    this.components = {};

    this.initializeComponents();
  }

  initializeComponents() {
    const section = document.getElementById(this.id);

    // Initialize components
    section.querySelectorAll('[data-component]').forEach(component => {
      switch(component.dataset.component) {
        case "timeseries":
          this.initializeTimeseries(component);
          break;

        case "summaryCard":
          this.initializeSummaryCards(component);
          break;

        default:
          break;
      }
    });
  }

  initializeSummaryCards(component) {
    this.components[component.dataset.id] = new SummaryCard(
      component.dataset.id,
      this.pageConfig,
      this.pageFilters,
      this.data
    );
  }

  initializeTimeseries(component) {
    this.components[component.dataset.id] = new Timeseries(
      component.dataset.id,
      this.pageConfig,
      this.pageFilters,
      this.data
    );
  }

  updateSection() {
    Object.values(this.components).forEach(component => {
      if(component.data !== this.data) {
        component.data = this.data;
      }
      component.updateContent();
    });
  }
}

window.Section = Section;
