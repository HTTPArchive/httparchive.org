class TableGeneral extends HTMLElement {
  constructor() {
    super();

    this.allData = [];

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-general').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['loaded', 'labels', 'columns', 'client', 'subcategory'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    this.renderComponent(property);
  }

  setTitle() {
    const columnHeading = this.shadowRoot.querySelector('table.table-ui thead tr');
    const _columns = this.columns?.replaceAll("*subcategory*", this.subcategory)
    const columns = _columns?.split(",");

    columnHeading.innerHTML = '';
    columns?.forEach((column) => {
      const headingCell = document.getElementById('table-general-heading-cell').content.cloneNode(true);
      headingCell.querySelector('th').textContent = this.labels?.values?.[column];
      columnHeading.append(headingCell);
    });
  }

  setData() {
    if(this.columns) {
      const _columns = this.columns.replaceAll("*subcategory*", this.subcategory)
      const columns = _columns.split(",");
      const body = this.shadowRoot.querySelector('tbody');
      body.innerHTML = '';
      this.allData.forEach((row) => {
        if(this.client === row.client) {
          const rowTemplate = document.getElementById('table-general-row').content.cloneNode(true).querySelector('tr');
          columns.forEach((column) => {
            const cell = document.getElementById('table-general-cell').content.cloneNode(true);
            cell.querySelector('td').textContent = row[column];
            rowTemplate.appendChild(cell);
          });
          body.appendChild(rowTemplate);
        }
      });
    }
  }

  renderComponent(property) {
    this.setTitle();
    this.setData();
  }
}

customElements.define('table-general', TableGeneral);
