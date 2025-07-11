import { DataUtils } from "./utils/data";
import { UIUtils } from "./utils/ui";

function formatData(tableConfig, data) {
  const { id, config, apps } = tableConfig;

  const component = document.getElementById(`table-${id}`);

  // Get the selected subcategory
  const subcategory = getSubcategory(config);
  const metric = component.dataset.metric;
  const endpoint = component.dataset.endpoint;

  // Create empty array
  const table = [];

  // Loop through all of the dates
  // Populate array of data rows with it
  const client = component.dataset.client || 'mobile';

  let _dates = [];

  Object.keys(data).forEach(app => {
    const date = data[app]?.map(entry => entry.date);
    _dates = [...new Set([..._dates, ...date])];
  });


  for(let i = 0; i < _dates?.length; i++) {
    const row = [];

    // Loop through each of the column configs
    config.columns?.forEach(column => {
      // Create object with necessary info to find the value
      const columnConfig = {
        config,
        column,
        client,
        subcategory,
        metric,
        endpoint,
      };


      // Add column cell for each of the apps
      // Filter by app name and then metric (key) to find the value
      if(column.breakdown === 'app') {
        apps.forEach(app => {
          row.push(getColumnCell({...columnConfig, app}, data, _dates[i]));
        });
      }

      // Add column cell with the data for the first app
      else {
        const app = apps[0];
        row.push(getColumnCell({...columnConfig, app}, data, _dates[i]));
      }
    });

    // Add row to the table
    table.push(row);
  }

  const sorted = sortTableBy(table, 'date');

  return sorted;
}

function sortTableBy(dataset, key) {
  return dataset.sort((a, b) => {
    const selectedA = a.find(obj => obj.key === key);
    const selectedB = b.find(obj => obj.key === key);

    return selectedA.value > selectedB.value ? -1 : 1;
  });
}

function getColumnCell(columnConfig, data, date) {
  const { column, client, app, subcategory, endpoint } = columnConfig;

  const _data = data[app]?.find(entry => entry.date === date);
  const endpointData = _data?.[endpoint];
  const subcategoryData = endpointData?.find(row => row.name === subcategory);
  const value = subcategoryData?.[client]?.[column.key];
  let styling;

  if(column.styleChange && column.keyNr) {
    styling = UIUtils.getChangeStatus(subcategoryData?.[client]?.[column.keyNr]);
  }

  const cell = {
    ...column,
    formattedKey: column.key,
    value: value,
    app: app,
    styling: styling,
  };

  return cell;
}

// Get the selected subcategory based on url
function getSubcategory(config) {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubcategory = urlParams.get(config.param);
  const subcategory = urlSubcategory || config.default || '';

  return subcategory;
}

// Update the table
function updateTable(id, config, appConfig, apps, data) {
  // Select a table based on the passed in id
  const component = document.getElementById(`table-${id}`)
  const tbody = component.querySelector('tbody');

  // Reset what's in the table before adding new content
  tbody.innerHTML = '';

  // Collect the settings in an object
  const tableConfig = {
    id,
    config,
    apps
  };

  // Format the data per row
  const rows = formatData(tableConfig, data);

  // Add rows to the table
  rows?.forEach(row => {
    const tr = document.createElement('tr');

    // Add columns to each row
    row?.forEach(column => {
      const cellType = column?.type === "heading" ? 'th' : 'td';
      let cell = document.createElement(cellType);

      let text = '';
      let className = column.className;

      const value = column.value;

      // Fill in the data if it exists
      if(value && value !== '') {
        const suffix = column.suffix || '';
        text = `${value}${suffix}`;
      } else {
        text = 'N/A';
        className += ' no-data';
      }

      // Wrap the text in a span for styling
      const wrapper = document.createElement('span');
      wrapper.innerHTML = text;
      cell.append(wrapper);

      // Stylized column groups (eg format `<column 1> / <column 2>`)
      if(column.hiddenSuffix) {
        /* In this case applying aria-hidden because otherwise
         * assistive tech would announce "/" at the end of col 1
         * or as part of the heading, which may be announced weirdly.
         * So since it's mainly decorative, we hide it as a precaution.
         */
        const hiddenSuffix = document.createElement('span');
        hiddenSuffix.setAttribute('aria-hidden', 'true');
        hiddenSuffix.innerHTML = column.hiddenSuffix;

        const textWrapper = document.createElement('span');
        textWrapper.innerHTML = text;

        const cellWrapper = document.createElement(cellType);
        cellWrapper.appendChild(textWrapper);
        cellWrapper.appendChild(hiddenSuffix);

        cell = cellWrapper;
      }

      // Expose percentages to css to use for styling
      if(text.includes('%')) {
        cell.setAttribute('style', `--cell-value: ${value}%`);
        cell.dataset.value = value;
      }

      // Add classnames from the config
      if(className) {
        cell.className = className;
      }

      if(column.viz === 'progress-circle' && value) {
        const score = DataUtils.getLighthouseScoreCategories(value, appConfig.lighthouse_brackets);
        wrapper.classList.add('progress-circle', score.name);
        wrapper.setAttribute('style', `--offset: ${value}%`);
      }

      if(column.styling) {
        wrapper.className = `monthchange ${column?.styling?.color} ${column?.styling?.direction}`;
      }

      // Add cell to the row
      tr.appendChild(cell);
    });

    // Add row to the body
    tbody.appendChild(tr);
  });
}

export const Table = {
  updateTable,
}
