import { Table } from "./table";

class Timeseries {
  // Create the component
  constructor(id, config, filters, data) {
    this.id = id;
    this.pageConfig = config;
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

      // Re-render the content
      this.updateContent();
      this.updateInfo(event.target.value);
    }
  }

  // Show/hide UI table
  toggleTable(event) {
    const button = event.target;
    const tableWrapper = document.getElementById(`${button.dataset.id}-table-wrapper`);
    if(tableWrapper.classList.contains('hidden')) {
      button.innerHTML = 'Hide table';
      tableWrapper.classList.remove('hidden');
    } else {
      button.innerHTML = 'Show table';
      tableWrapper.classList.add('hidden');
    }
  }

  // Re-render the title, description, and text labels
  updateInfo(value) {
    const option = this.pageConfig?.labels?.metrics[value];
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
    Table.updateTable(this.id, this.pageConfig[this.id]?.table, this.pageFilters.app, this.data);
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

    const app = pageFilters.app[0];
    const sorted = data?.[app]?.sort((a, b) => new Date(b.date) - new Date(a.date));

    if(sorted) {
      /* Select the container to which we'll add elements. */
      const viz = document.querySelector(`[data-id="${id}"]`);
      const container = viz.querySelector('.breakdown-list');

      /* Get the currently selected subcategory based on the URL */
      const urlParams = new URLSearchParams(window.location.search);
      const urlSubcategory = urlParams.get(config.param);
      const subcategory = urlSubcategory || config.default;

      /* Remove the previous content */
      container.innerHTML = '';

      /* Update the date to the most recent timestamp in the dataset */
      viz.querySelector('[data-slot="timestamp"]').innerHTML = sorted?.[0].date;

      /* For each of the breakdowns, add a component with the latest data */
      config.series.values.forEach(breakdown => {
        /* Get the latest values */
        const breakdownData = sorted?.filter(row => row.client === breakdown.name);
        const latest = breakdownData[0];
        const latestValue = latest[`${config.base}${subcategory}`];

        /* Create a wrapper */
        const itemWrapper = document.createElement('div');
        itemWrapper.classList.add('breakdown-item');
        itemWrapper.style.setProperty('--breakdown-color', breakdown.color);

        /* Add a text label to the wrapper */
        const breakdownLabel = document.createElement('p');
        breakdownLabel.textContent = breakdown.name;
        breakdownLabel.classList.add('breakdown-label');
        itemWrapper.appendChild(breakdownLabel);

        /* Add the value to the wrapper */
        const valueLabel = document.createElement('p');
        valueLabel.textContent = `${latestValue}${breakdown.suffix || ''}`;
        valueLabel.classList.add('breakdown-value');
        itemWrapper.appendChild(valueLabel);

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

    const metric = this.getMetric(config);
    const component = document.querySelector(`[data-id="${this.id}"]`);
    const client = component.dataset.client;
    const container = component.querySelector('.breakdown-list');

    pageFilters.app.forEach(app => {
      const sorted = data?.[app]?.sort((a, b) => new Date(b.date) - new Date(a.date));

      if(sorted && sorted.length > 0) {
        const filtered = sorted?.filter(row => row.client === client);
        const latest = filtered[0];

        /* Select the container to which we'll add elements. */
        const card = container.querySelector(`[data-app="${app}"]`);
        const timestamp = component.querySelector('[data-slot="timestamp"]');
        const label = card.getElementsByClassName('breakdown-label')[0];
        const value = card.getElementsByClassName('breakdown-value')[0];

        /* Update text */
        label.innerHTML = latest.app;
        value.innerHTML = `${latest[metric]}${config.series.suffix || ''}`;
        timestamp.innerHTML = latest.date;

      }
    })

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
      timeseries.series = this.formatSeries();
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

    // Get the viz settings
    const config = this.pageConfig[this.id]?.viz;
    const metric = this.getMetric(config);

    // Get the selected client
    const component = document.querySelector(`[data-id="${this.id}"]`);
    const client = component.dataset.client;

    Object.values(this.data).forEach(app => {
      const data = app.filter(row => row.client === client).map(row => {
        return {
          x: new Date(row.date),
          y: Number(row[metric]),
        };
      });

      series.push({
        name: app[0].app,
        data: data,
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

    const metric = this.getMetric(config);

    // Breakdown data by categories defined in config
    config?.series?.values?.forEach((value, index) => {
      // Filter by selected client & sort
      const filteredData = this.data?.[app]?.filter(entry => entry.client === value.name);
      filteredData?.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Add the values for the selected metric to a new array of objects
      // Formatted as coordinates for Highcharts
      const formattedData = [];
      filteredData?.forEach(row => {
        formattedData.push({
          x: new Date(row.date),
          y: Number(row[metric]),
        });
      });

      // Push the configurations and formatted data to the series array
      series.push(
        {
          name: value.name,
          data: formattedData,
          color: value.color || colors[index],
          lineWidth: 2,
        }
      )
    });

    return series;
  }

  getMetric(config) {
    // The default metric from the settings
    const defaultMetric = config.metric;

    // Get the submetric from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlSubcategory = urlParams.get(config.param);

    return urlSubcategory ? `${config.base}${urlSubcategory}` : defaultMetric;
  }

  // Get the default settings
  defaults(config) {
    const defaults = {
      type: 'timeseries',
      chart: {
        colors: ['#070746', '#157F56', '#C9200D', '#AA0DC9'],
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
    };

    return defaults;
  }
}

/* Make the component availble everywhere */
window.Timeseries = Timeseries;
