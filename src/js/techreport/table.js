// TODO: expected data format: rows[{column:...}]
function structureData() {

}

function updateTable(id, config, app, data) {
  // Select a table based on the passed in id
  const component = document.getElementById(`table-${id}`)
  const tbody = component.querySelector('tbody');

  // Reset what's in the table before adding new content
  tbody.innerHTML = '';

  // Get the selected subcategory
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubcategory = urlParams.get(config.param);
  const subcategory = urlSubcategory || config.default || '';

  // Filter data by selected client
  const client = component.dataset.client || 'mobile';
  const _data = data[app]?.filter(entry => entry.client === client);

  // Create a new row for each entry in the data
  _data?.forEach(entry => {
    const tr = document.createElement('tr');

    // Add a (regular or heading) cell based on configured columns
    config.columns?.forEach(column => {
      const cellType = column.type === "heading" ? 'th' : 'td';
      let cell = document.createElement(cellType);

      let label = '';
      let className = column.className;

      const key = column.key.replaceAll("*subcategory*", subcategory);
      const value = entry[key];

      // Fill in the data if it exists
      if(value && value !== '') {
        const suffix = column.suffix || '';
        label = `${value}${suffix}`;
      } else {
        label = 'N/A';
        className += ' no-data'
      }

      // Wrap the label in a span for styling
      const wrapper = document.createElement('span');
      wrapper.innerHTML = label;
      cell.append(wrapper);

      // For stylized columns (eg <column 1> out of <column 2>)
      if(column.hiddenSuffix) {
        const hiddenSuffix = document.createElement('span');
        hiddenSuffix.setAttribute('aria-hidden', 'true');
        hiddenSuffix.innerHTML = column.hiddenSuffix;

        const labelWrapper = document.createElement('span');
        const cellWrapper = document.createElement(cellType);

        labelWrapper.innerHTML = label;

        cellWrapper.appendChild(labelWrapper);
        cellWrapper.appendChild(hiddenSuffix);

        cell = cellWrapper;
      }

      // Expose percentages to css to use for styling
      if(label.includes('%')) {
        cell.setAttribute('style', `--cell-value: ${value}%`);
        cell.dataset.value = value;
      }

      // Add classnames from the config
      if(column.className) {
        cell.className = className;
      }

      // Add cell to the row
      tr.appendChild(cell);
    });

    // Update the table
    tbody.appendChild(tr);
  });
}

export const Table = {
  updateTable,
}
