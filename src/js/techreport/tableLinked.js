class TableLinked {
  constructor(id, config, filters, data) {
    this.id = id;
    this.pageConfig = config;
    this.pageFilters = filters;
    this.submetric = ''; // TODO: Fetch the default one from somewhere
    this.data = data;

    this.updateContent();
  }

  // Format the data to fit in the table structure
  formatData(tableConfig, data) {
    const { apps, id, config } = tableConfig;

    const rows = [];

    apps.forEach(app => {

    });
  }

  // Update content in the table
  updateContent() {
    // Select a table based on the passed in id
    const component = document.getElementById(`table-${this.id}`);
    const tbody = component?.querySelector('tbody');

    if(tbody) {
      // Reset what's in the table before adding new content
      tbody.innerHTML = '';

      // Collect the settings in an object
      const tableConfig = {
        apps: this.pageFilters.app,
        config: this.pageConfig?.[this.id]?.table,
        id: this.id,
      };

      tableConfig.apps.forEach(app => {
        const data = this.data[app];
        const sorted = data?.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted?.[0];

        if(latest) {
          const tr = document.createElement('tr');

          tableConfig.config?.columns?.forEach(column => {
            let cell;
            if(column.type === 'heading') {
              cell = document.createElement('th');
              const link = document.createElement('a');
              link.setAttribute('href', `?tech=${app}`);
              link.innerHTML = app;
              cell.append(link);
            } else if(column.key === 'client') {
              cell = document.createElement('td');
              cell.innerHTML = component.dataset.client;
            } else {
              cell = document.createElement('td');
              const dataset = latest?.[column?.endpoint];
              let value = dataset?.find(entry => entry.name === column.subcategory);
              value = value?.[component.dataset.client]?.[column?.metric];
              cell.innerHTML = value;
            }



            tr.append(cell);
          });
          tbody.append(tr);
        }
      });
    }
  }
}

export default TableLinked;
