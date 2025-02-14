import SummaryCard from "./summaryCards";
import TableLinked from "./tableLinked";

class Section {
  constructor(id, pageConfig, globalConfig, filters, data) {
    this.id = id;
    this.data = data;
    this.pageConfig = pageConfig;
    this.config = globalConfig;
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

        case "table":
          this.initializeTable(component);
          break;

        default:
          break;
      }
    });
  }

  initializeTable(component) {
    this.components[component.dataset.id] = new TableLinked(
      component.dataset.id,
      this.pageConfig,
      this.config,
      this.pageFilters,
      this.data
    );
  }

  initializeSummaryCards(component) {
    this.components[component.dataset.id] = new SummaryCard(
      component.dataset.id,
      this.pageConfig,
      this.config,
      this.pageFilters,
      this.data
    );
  }

  initializeTimeseries(component) {
    this.components[component.dataset.id] = new Timeseries(
      component.dataset.id,
      this.pageConfig,
      this.config,
      this.pageFilters,
      this.data
    );
  }

  updateSection(content) {
    Object.values(this.components).forEach(component => {
      if(component.data !== this.data) {
        component.data = this.data;
      }
      if(component.pageFilters !== this.pageFilters) {
        component.pageFilters = this.pageFilters;
      }
      component.updateContent(content);
    });
  }
}

window.Section = Section;
