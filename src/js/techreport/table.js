// TODO: expected data format: rows[{column:...}]
function structureData() {

}

function updateTable(id, config, app, data) {
  const component = document.getElementById(`table-${id}`)
  const tbody = component.querySelector('tbody');
  tbody.innerHTML = '';

  const urlParams = new URLSearchParams(window.location.search);
  const urlSubcategory = urlParams.get(config.param);
  const subcategory = urlSubcategory || config.default || '';

  data[app]?.forEach(entry => {
    const tr = document.createElement('tr');

    config.columns?.forEach(column => {
      let element = document.createElement('td');
      if(column.type === "heading") {
        element = document.createElement('th');
      }

      const key = column.key.replaceAll("*subcategory*", subcategory);
      const value = entry[key];
      element.innerHTML = value;
      tr.appendChild(element);
    });

    tbody.appendChild(tr);
  });
}

export const Table = {
  updateTable,
}
