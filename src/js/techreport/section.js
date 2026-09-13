/* global Timeseries, GeoBreakdown, CwvDistribution */

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
    this.initializeCwvButtonBar();
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

        case "geoBreakdown":
          this.initializeGeoBreakdown(component);
          break;

        case "cwvDistribution":
          this.initializeCwvDistribution(component);
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

  initializeGeoBreakdown(component) {
    this.components[component.dataset.id] = new GeoBreakdown(
      component.dataset.id,
      this.pageConfig,
      this.config,
      this.pageFilters,
      this.data
    );
  }

  initializeCwvDistribution(component) {
    this.components[component.dataset.id] = new CwvDistribution(
      component.dataset.id,
      this.pageConfig,
      this.config,
      this.pageFilters,
      this.data
    );
  }

  initializeCwvButtonBar() {
    const section = document.getElementById(this.id);
    if (!section) return;
    const bar = section.querySelector('.cwv-button-bar');
    if (!bar) return;

    const tw = document.getElementById('good_cwv_timeseries-table-wrapper') ||
      section.querySelector('[id$="-table-wrapper"]');

    // Move the timeseries' table wrapper out of the timeseries div so expanding it
    // doesn't push the button bar down
    if (bar && tw && tw.parentNode !== bar.parentNode) {
      bar.parentNode.insertBefore(tw, bar.nextSibling);
    }

    // Mutual exclusion: only one panel open at a time
    const panels = [
      { btn: bar.querySelector('.cwv-show-table-btn'), wrapper: tw, showText: 'Show table' },
      { btn: document.getElementById('geo-breakdown-btn'), wrapper: document.getElementById('section-geo_breakdown'), showText: 'Show geographic breakdown' },
      { btn: document.getElementById('cwv-distribution-btn'), wrapper: document.getElementById('section-cwv_distribution'), showText: 'Show histogram' }
    ].filter(p => p.btn && p.wrapper);

    panels.forEach(panel => {
      panel.btn.addEventListener('click', () => {
        panels.forEach(other => {
          if (other !== panel && !other.wrapper.classList.contains('hidden')) {
            other.wrapper.classList.add('hidden');
            other.btn.textContent = other.showText;
            // As table doesn't set the hash, clear it to avoid showing old value
            if (window.location.hash) {
              const url = new URL(window.location.href);
              url.hash = '';
              window.history.replaceState(null, null, url);
            }
          }
        });
      }, true);
    });
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
