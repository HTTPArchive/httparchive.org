let pageConfig;
let pageFilters;

const colors = ['#04c7fd', '#a62aa4'];

function init(page, filters) {
  pageConfig = page.config;
  pageFilters = filters;

  updateAllComponents();
  bindToggleButtons();
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

  console.log(timeseries.chart);

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
    timeseries.xAxis.categories = getCategories(data, config);
  }

  /* Render the chart */
  Highcharts.chart(`${id}-timeseries`, timeseries);
}

function getCategories(data, config) {
  const app = pageFilters.app[0];
  const dates = [];
  const sorted = data[app].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(entry => dates.push(entry.date));
  return dates;
}

function getSeries(data, config) {
  const series = [];
  const app = pageFilters.app[0];
  if(config.series.breakdown === 'client') {
    config.series.values.forEach((value, index) => {
      const filteredData = data[app].filter(entry => entry.client === value);
      filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

      const formattedData = [];
      filteredData.forEach(row => formattedData.push(Number(row[config.metric])));

      series.push(
        {
          name: value,
          data: formattedData,
          color: colors[index],
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
      categories: config.xAxis.defaults,
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
