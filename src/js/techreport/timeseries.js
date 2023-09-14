let pageConfig;
let pageFilters;
let pageData;
let charts = [];

const colors = ['#449BC6', '#AF5AB6'];

function init(page, filters) {
  pageConfig = page.config;
  pageFilters = filters;

  updateAllComponents();
  bindToggleButtons();
  bindSubcategorySelector();
}

function bindSubcategorySelector() {
  const selectors = Object.values(document.getElementsByClassName('subcategory-selector'));
  selectors.forEach(selector => {
    selector.addEventListener('change', (event) => {
      const url = new URL(window.location.href);
      url.searchParams.set(event.target.dataset.param, event.target.value);
      window.history.replaceState(null, null, url);

      const id = event.target.dataset.controls;
      const querySelector = `[data-id="${id}"][data-component="timeseries"]`;
      const timeseries = document.querySelector(querySelector);

      if(pageConfig[id].viz) {
        pageConfig[id].viz.current = event.target.value;
        pageConfig[id].viz.base = event.target.dataset.base;
      }

      document.getElementById(`${id}-timeseries`).innerHTML = '';
      updateComponent(timeseries, pageData);
    });
  });
}

function bindToggleButtons() {
  const buttons = Object.values(document.getElementsByClassName('show-table'));
  buttons.forEach(button => {
    button.addEventListener('click', toggleButton);
  });
}

function toggleButton(event) {
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

function updateData(data) {
  pageData = data;
  updateAllComponents(data);
}

function updateAllComponents(data) {
  const timeseries = document.querySelectorAll('[data-component="timeseries"]');
  Array.from(timeseries).forEach(component => updateComponent(component, data));
}

function updateComponent(component, data) {
  const id = component.dataset.id;
  const config = pageConfig[id].viz;

  drawViz(id, config, data);
}

function drawViz(id, config, data) {
  const timeseries = defaults(config);

  /* Accessibility configs */
  if(config.caption) {
    timeseries.caption = {
      text: config.caption,
    };
  }

  if(pageConfig[id].valueSuffix) {
    timeseries.accessibility.point = {
      ...timeseries.accessibility.point,
      'valueSuffix': pageConfig[id].valueSuffix,
    }
  }

  /* Chart styling configs */
  timeseries.chart = {
    ...timeseries.chart,
    height: config.height,
  };

  /* Axis styling */
  timeseries.yAxis = {
    ...timeseries.yAxis,
    tickAmount: config.yAxis.tickAmount,
  }

  timeseries.xAxis = {
    ...timeseries.xAxis,
    tickAmount: config.xAxis.tickAmount,
  }

  /* Set the data */
  if(data) {
    timeseries.series = getSeries(data, config);
  }

  /* Render the chart */
  Highcharts.chart(`${id}-timeseries`, timeseries);
}

function getSeries(data, config) {
  const series = [];
  const app = pageFilters.app[0];

  const defaultMetric = config.metric;
  const currentSubcategory = config.current;
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubcategory = urlParams.get(config.param);

  console.log(urlParams, urlSubcategory);

  let metric = defaultMetric;

  console.log('metric', metric, 'currentSubcategory', currentSubcategory);
  console.log('config', config, 'config.base', config.base);

  if(urlSubcategory) {
    metric = `${config.base}${urlSubcategory}`;
  }

  if(currentSubcategory) {
    metric = `${config.base}${currentSubcategory}`;
  }

  console.log(metric, 'default', defaultMetric);

  if(config?.series?.breakdown === 'client') {
    config?.series?.values?.forEach((value, index) => {
      const filteredData = data[app].filter(entry => entry.client === value);
      filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

      const formattedData = [];
      filteredData.forEach(row => {
        formattedData.push({
          x: new Date(row.date),
          y: Number(row[metric]),
        });
      });

      series.push(
        {
          name: value,
          data: formattedData,
          color: colors[index],
          lineWidth: 2,
        }
      )
    });
  }

  return series;
}

function defaults(config) {
  const defaults = {
    type: 'timeseries',
    chart: {
      colors: ['#070746', '#157F56', '#C9200D', '#AA0DC9'],
    },
    title: {
      text: config.title,
    },
    accessibility: {},
    series: config.series.defaults,
    xAxis: {
      title: {
        text: config.xAxis.title,
      },
      type: 'datetime'
    },
    yAxis: {
      title: {
        text: config.yAxis.title,
      },
    },
  };

  return defaults;
}

function updateFilters(data, filters) {
  /* Filters get saved so other functions have access to it*/
  pageFilters = filters;

  updateAllComponents(data);
}


export const Timeseries = {
  init,
  updateAllComponents,
  updateData,
  updateFilters,
};
