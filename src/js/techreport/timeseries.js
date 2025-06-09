/* global Highcharts */

import { Table } from "./table";
import { DataUtils } from "./utils/data";
import { UIUtils } from "./utils/ui";
class Timeseries {
  // Create the component
  constructor(id, pageConfig, config, filters, data) {
    this.id = id;
    this.pageConfig = pageConfig;
    this.config = config;
    this.pageFilters = filters;
    this.submetric = ''; // TODO: Fetch the default one from somewhere
    this.data = data;

    this.updateContent();
    this.bindEventListeners();
  }

  // Check if anything in the component updates
  bindEventListeners() {
    const subcategory = `[data-id="${this.id}"] .subcategory-selector`;
    document.querySelectorAll(subcategory).forEach(dropdown => {
      dropdown.addEventListener('change', (event) => this.updateSubmetric(event));
    });

    const buttons = Object.values(document.getElementsByClassName('show-table'));
    buttons.forEach(button => {
      button.addEventListener('click', this.toggleTable);
    });
  }

  // Filter and re-render the component when the submetric changes
  updateSubmetric(event) {
    if(this.submetric !== event.target.value) {
      // Update the URL
      const url = new URL(window.location.href);
      url.searchParams.set(event.target.dataset.param, event.target.value);
      window.history.replaceState(null, null, url);

      // Get the relevant endpoint and metric
      const endpoint = event.target.dataset.endpoint;
      const metric = event.target.value;

      // Re-render the content
      this.updateContent();
      this.updateInfo(metric, endpoint);
    }
  }

  // Show/hide UI table
  toggleTable(event) {
    const button = event.target;
    const tableWrapper = document.getElementById(`${button.dataset.id}-table-wrapper`);
    if(tableWrapper.classList.contains('hidden')) {
      button.textContent = 'Hide table';
      tableWrapper.classList.remove('hidden');
    } else {
      button.textContent = 'Show table';
      tableWrapper.classList.add('hidden');
    }
  }

  // Re-render the title, description, and text labels
  updateInfo(metric, endpoint) {
    const option = this.pageConfig?.labels?.metrics[endpoint][metric];
    const component = document.querySelector(`[data-id="${this.id}"]`);

    if(option && option.title) {
      const title = component.querySelector('h3');
      title.innerHTML = option.title;
    }

    if(option && option.description) {
      const descr = component.querySelector('.descr');
      descr.innerHTML = option.description;
    }
  }

  // Re-render the contents of the component
  updateContent() {
    if(this.pageConfig[this.id]?.summary) {
      this.updateSummary();
    }
    this.updateViz();
    Table.updateTable(this.id, this.pageConfig[this.id]?.table, this.config, this.pageFilters.app, this.data);
  }

  // Update the summary with the latest data for all categories
  // TODO: only works this way in the single tech, for comparison we need to do this differently
  updateSummary() {
    switch(this.pageConfig.default.series.breakdown) {
      case 'client':
        this.updateClientSummary();
        break;
      case 'app':
        this.updateAppSummary();
        break;
    }
  }

  updateClientSummary() {
    const config = this.pageConfig[this.id]?.viz;
    const data = this.data;
    const id = this.id;
    const pageFilters = this.pageFilters;

    /* Select the container to which we'll add elements. */
    const viz = document.querySelector(`[data-id="${id}"]`);
    const container = viz.querySelector('.breakdown-list');

    /* Get settings */
    const metric = viz.dataset.metric;
    const endpoint = viz.dataset.endpoint;
    const summary = viz.dataset.summary;

    const app = pageFilters.app[0];
    const filtered = data?.[app]?.filter(entry => entry[endpoint]);
    const sorted = filtered?.sort((a, b) => new Date(b.date) - new Date(a.date));

    if(sorted) {
      /* Get the currently selected subcategory based on the URL */
      const urlParams = new URLSearchParams(window.location.search);
      const urlSubcategory = urlParams.get(config.param);
      const subcategory = urlSubcategory || config.default;
      const showChange = container.dataset.change;
      const changeMeaning = container?.dataset?.meaning;

      /* Remove the previous content */
      container.innerHTML = '';

      /* Update the date to the most recent timestamp in the dataset */
      viz.querySelector('[data-slot="timestamp"]').innerHTML = sorted?.[0]?.date;

      /* For each of the breakdowns, add a component with the latest data */
      config.series.values.forEach(breakdown => {
        /* Get the latest values */
        const latestData = sorted[0];
        const categoryData = latestData?.[endpoint]?.find(row => row.name === subcategory);
        const latestValue = categoryData?.[breakdown.name]?.[metric];

        /* Create a wrapper */
        const itemWrapper = document.createElement('div');
        itemWrapper.classList.add('breakdown-item');

        /* Set the breakdown color depending on chosen theme */
        const theme = document.querySelector('html').dataset.theme;
        const themeColor = theme === 'dark' ? breakdown.color_dark : breakdown.color;
        itemWrapper.style.setProperty('--breakdown-color', themeColor);

        /* Add a text label to the wrapper */
        const breakdownLabel = document.createElement('p');
        breakdownLabel.textContent = breakdown.name;
        breakdownLabel.classList.add('breakdown-label');
        itemWrapper.appendChild(breakdownLabel);

        /* If defined, use a different metric for the summary */
        if(summary) {
          const valueLabel = document.createElement('p');
          valueLabel.textContent = categoryData?.[breakdown.name]?.[summary];
          valueLabel.classList.add('breakdown-value');
          itemWrapper.appendChild(valueLabel);
        } else {
          /* Add the value to the wrapper */
          const valueLabel = document.createElement('p');
          valueLabel.textContent = `${latestValue.toLocaleString()}${breakdown.suffix || ''}`;
          valueLabel.classList.add('breakdown-value');
          itemWrapper.appendChild(valueLabel);
        }

        /* Add the month over month change */
        if(showChange) {
          const latestMoM = categoryData?.[breakdown.name]?.momPerc;
          const latestMoMStr = categoryData?.[breakdown.name]?.momString;
          const styling = UIUtils.getChangeStatus(latestMoM, changeMeaning);
          const monthChange = document.createElement('span');
          monthChange.textContent = latestMoMStr;
          monthChange.className = `monthchange ${styling?.color} ${styling?.direction}`;
          itemWrapper.appendChild(monthChange);
        }

        /* Add the wrapper to the container */
        container.appendChild(itemWrapper);
      });
    }
  }

  updateAppSummary() {
    const config = this.pageConfig[this.id]?.viz;
    const data = this.data;
    const id = this.id;
    const pageFilters = this.pageFilters;

    const component = document.querySelector(`[data-id="${id}"]`);
    const container = component.querySelector('.breakdown-list');

    /* Get the currently selected subcategory based on the URL */
    const urlParams = new URLSearchParams(window.location.search);
    const urlSubcategory = urlParams.get(config.param);
    const subcategory = urlSubcategory || config.default;

    /* Get settings */
    const metric = component.dataset.metric;
    const endpoint = component.dataset.endpoint;
    const client = component.dataset.client;
    const summary = component.dataset.summary;
    const showChange = container.dataset.change;
    const changeMeaning = container?.dataset?.meaning;

    pageFilters.app.forEach((app, index) => {
      if(data[app] && data[app].length > 0) {
        const sorted = data[app].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];

        /* Select value */
        const latestEndpoint = latest[endpoint];
        const latestSubcategory = latestEndpoint?.find(row => row.name === subcategory);
        const latestClient  = latestSubcategory?.[client];
        const latestValue = latestClient?.[metric]?.toLocaleString();
        const summaryValue = latestClient?.[summary]?.toLocaleString();

        /* Select the container to which we'll add elements. */
        const card = container.querySelector(`[data-app="${app}"]`);
        const timestamp = component.querySelector('[data-slot="timestamp"]');
        const label = card.getElementsByClassName('breakdown-label')[0];
        const value = card.getElementsByClassName('breakdown-value')[0];

        /* Update text */
        const formattedApp = DataUtils.formatAppName(latest.technology);
        label.textContent = formattedApp;
        if(latestValue) {
          if(summary) {
            value.textContent = `${summaryValue}`;
          } else {
            value.textContent = `${latestValue}${config.series.suffix || ''}`;
          }
        } else {
          value.classList.add('undefined');
          value.textContent = 'No data';
        }
        timestamp.textContent = latest.date;
        const techColor = UIUtils.getAppColor(app, this.pageFilters.app, this.pageConfig.colors);
        const fallback = this.pageConfig.colors.app[index];
        card.style.setProperty('--breakdown-color', techColor || fallback);

        /* Add the month over month change */
        if(showChange) {
          const latestMoM = latestClient?.momPerc;
          const latestMoMStr = latestClient?.momString;
          const styling = UIUtils.getChangeStatus(latestMoM, changeMeaning);
          const monthChange = document.createElement('span');
          monthChange.textContent = latestMoMStr;
          monthChange.className = `monthchange ${styling?.color} ${styling?.direction}`;
          card.appendChild(monthChange);
        }
      }
    });
  }

  // Update the highcharts timeseries
  updateViz() {
    const config = this.pageConfig[this.id]?.viz;
    const timeseries = this.defaults(config);

    // Accessibility settings
    if(config && config.caption) {
      timeseries['caption'] = {
        text: config.caption,
      };
    }

    if(this.pageConfig[this.id].valueSuffix) {
      timeseries.accessibility.point = {
        ...timeseries.accessibility.point,
        'valueSuffix': this.pageConfig[this.id].valueSuffix,
      }
    }

    // General styling
    timeseries.chart = {
      ...timeseries.chart,
      height: config?.height,
    };

    // Axis settings
    timeseries.yAxis = {
      ...timeseries.yAxis,
      tickAmount: config?.yAxis?.tickAmount,
    }

    timeseries.xAxis = {
      ...timeseries.xAxis,
      tickAmount: config?.xAxis?.tickAmount,
    }

    // Update the data
    if(this.data) {
      const formatted = this.formatSeries();
      timeseries.series = formatted;
    }

    timeseries.tooltip = {
      shared: true,
      crosshairs: true,
      useHTML: true,
      formatter: function() {
        const wrapper = document.createElement('div');
        wrapper.className = 'tooltip-wrapper';

        const d =  Highcharts.dateFormat('%b %e, %Y', this.x);

        const dateEl = document.createElement('p');
        dateEl.innerHTML = d;

        wrapper.appendChild(dateEl);

        const pointList = document.createElement('ul');

        this.points.forEach(point => {
          const pointItem = document.createElement('li');
          const pointSeries = document.createElement('span');

          const pointSvg = document.createElement('svg');
          let pointSymbol;

          switch(point?.point?.graphic?.symbolName) {
            case 'circle':
              pointSymbol = document.createElement('circle');
              pointSymbol.setAttribute('class', 'point-symbol circle');
              pointSymbol.setAttribute('r', point.point.graphic.width / 2);
              pointSymbol.setAttribute('stroke', point.color);
              pointSymbol.setAttribute('stroke-width', point.point.graphic['stroke-width']);
              break;

            case 'diamond':
              pointSymbol = document.createElement('path');
              pointSymbol.setAttribute('class', 'point-symbol diamond');
              pointSymbol.setAttribute('d', 'M 4 0 L 8 4 L 4 8 L 0 4 Z');
              pointSymbol.setAttribute('stroke', point.color);
              pointSymbol.setAttribute('stroke-width', point.point.graphic['stroke-width']);
              break;

            case 'square':
              pointSymbol = document.createElement('path');
              pointSymbol.setAttribute('class', 'point-symbol square');
              pointSymbol.setAttribute('d', 'M 0 0 L 8 0 L 8 8 L 0 8 Z');
              pointSymbol.setAttribute('stroke', point.color);
              pointSymbol.setAttribute('stroke-width', point.point.graphic['stroke-width']);
              break;

            case 'triangle-down':
              pointSymbol = document.createElement('path');
              pointSymbol.setAttribute('class', 'point-symbol triangle-down');
              pointSymbol.setAttribute('d', 'M 0 0 L 8 0 L 4 8 Z');
              pointSymbol.setAttribute('stroke', point.color);
              pointSymbol.setAttribute('stroke-width', point.point.graphic['stroke-width']);
              break;

            case 'triangle':
              pointSymbol = document.createElement('path');
              pointSymbol.setAttribute('class', 'point-symbol triangle-up');
              pointSymbol.setAttribute('d', 'M 4 0 L 8 8 L 0 8 Z');
              pointSymbol.setAttribute('stroke', point.color);
              pointSymbol.setAttribute('stroke-width', point.point.graphic['stroke-width']);
              break;


            default:
              pointSymbol = document.createElement('circle');
              pointSymbol.setAttribute('class', 'point-fallback');
              pointSymbol.setAttribute('r', '4');
              pointSymbol.setAttribute('fill', point.color);
              break;
          }

          pointSvg.appendChild(pointSymbol);

          document.getElementsByTagName('main')[0].append(pointSvg);

          pointSeries.innerHTML = point.series.name;
          pointItem.innerHTML = `${pointSvg.outerHTML} ${pointSeries.outerHTML}: ${point.y.toLocaleString()}`;

          pointList.appendChild(pointItem);
        });

        wrapper.appendChild(pointList);

        return wrapper.outerHTML;
      }
    }

    // Render the chart
    Highcharts.chart(`${this.id}-timeseries`, timeseries);
  }

  // Format the data in the format Highcharts needs it to be
  formatSeries() {
    const breakdown = this.pageConfig?.default?.series?.breakdown;
    let series;
    switch(breakdown) {
      case 'client':
        series = this.formatDataByClient();
        return series;
      case 'app':
        series = this.formatDataByApp();
        return series;
      default:
        console.log('unknown breakdown');
        return;
    }
  }

  // Format the data broken down by app
  formatDataByApp() {
    const series = [];

    // Get the selected client
    const component = document.querySelector(`[data-id="${this.id}"]`);

    // Get the viz settings
    const metric = component.dataset.metric;
    const endpoint = component.dataset.endpoint;
    const client = component.dataset.client;

    // Get the currently selected subcategory based on the URL
    const config = this.pageConfig[this.id]?.viz;
    const urlParams = new URLSearchParams(window.location.search);
    const urlSubcategory = urlParams.get(config.param);
    const subcategory = urlSubcategory || config.default;

    // Get default colors
    const colors = this.defaults(config)?.chart?.colors;

    // Create series to use in Highcharts
    Object.values(this.data).forEach((app, index) => {
      const tech = app[0]?.technology;
      const techColor = UIUtils.getAppColor(tech, this.pageFilters.app, this.pageConfig.colors);

      const data = app.map(row => {
        const value = row?.[endpoint]?.find(row => row.name === subcategory)?.[client]?.[metric];
        return {
          x: new Date(row.date).getTime(),
          y: value || 0,
        };
      });

      const sortedData = data.sort((a, b) => new Date(a.x) - new Date(b.x) ? -1 : 1);

      series.push({
        name: tech,
        data: sortedData,
        color: techColor || colors[index]
      });
    });

    return series;
  }

  // Format the data broken down by client
  formatDataByClient() {
    // Empty array that we'll populate later
    const series = [];

    // Get the viz settings
    const config = this.pageConfig[this.id]?.viz;
    const app = this.pageFilters.app[0];
    const endpoint = this.pageConfig[this.id]?.endpoint;
    const metric = this.pageConfig[this.id]?.metric;
    const category = this.getCategory(config);

    // Get color scheme
    const theme = document.querySelector('html').dataset.theme;

    // Breakdown data by categories defined in config
    config?.series?.values?.forEach((value, index) => {
      // Filter by selected client & sort
      const appData = this.data?.[app];

      // Add the values for the selected metric to a new array of objects
      // Formatted as coordinates for Highcharts
      const formattedData = [];
      appData?.forEach(row => {
        const categoryData = row?.[endpoint]?.find(row => row.name === category);
        const clientData = categoryData?.[value.name];
        const y = clientData?.[metric];
        formattedData.push({
          x: new Date(row.date).getTime(),
          y: Number(y),
        });
      });

      const sortedData = formattedData.sort((a, b) => new Date(a.x) - new Date(b.x));

      // Pick color from settings depending on theme
      const colors = this.defaults(config)?.chart?.colors;
      const colorDark = value.color_dark;
      const colorLight = value.color;
      const seriesColor = theme === "dark" ? colorDark : colorLight;

      // Push the configurations and formatted data to the series array
      series.push(
        {
          name: value.name,
          data: sortedData,
          color: seriesColor || colors?.[index],
          lineWidth: 2,
        }
      )
    });

    return series;
  }

  getCategory(config) {
    // The default metric from the settings
    const defaultMetric = config.default;

    // Get the submetric from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlSubcategory = urlParams.get(config.param);

    return urlSubcategory || defaultMetric;
  }

  // Get the default settings
  defaults(config) {
    const showIndicators = document.querySelector('main').dataset.showIndicators === true
      || document.querySelector('main').dataset.showIndicators === "true";
    const defaults = {
      type: 'timeseries',
      chart: {
        colors: this.pageConfig.colors?.app,
      },
      title: {
        text: config?.title,
      },
      accessibility: {},
      series: config?.series?.defaults,
      xAxis: {
        title: {
          text: config?.xAxis?.title,
        },
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: config?.yAxis?.title,
        },
      },
      plotOptions: {
        series: {
          lineWidth: 2,
          marker: {
            enabled: showIndicators,
            fillColor: '#ffffff',
            lineWidth: 2,
            lineColor: null // inherit from series
          },
        },
      },
    };

    return defaults;
  }
}

/* Make the component availble everywhere */
window.Timeseries = Timeseries;
