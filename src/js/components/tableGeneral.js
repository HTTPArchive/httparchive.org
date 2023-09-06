class TableGeneral extends HTMLElement {
  constructor() {
    super();

    this.allData = [];
    this.subcategory = '';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-general').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
    this.renderSubcategorySelector();
  }

  static get observedAttributes() {
    return ['loaded', 'labels', 'columns', 'client', 'subcategory', 'id'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    this.renderComponent();
  }

  renderSubcategorySelector() {
    /* Get the subcategory slot content. */
    const subcategorySelector = this.shadowRoot.querySelector('slot[name="subcategory-selector"]');

    /* Only add event listener if subcategory slots were added. */
    if(subcategorySelector) {
      subcategorySelector.addEventListener('change', (event) => {
        this.setAttribute('subcategory', event.target.value);
        const url = new URL(window.location.href);
        url.searchParams.set(this.id, event.target.value);
        window.history.replaceState(null, null, url);
      });
    }
  }

  setTitle() {
    const columnHeading = this.shadowRoot.querySelector('table.table-ui thead tr');
    const _columns = this.columns?.replaceAll("*subcategory*", this.subcategory);
    const columns = _columns?.split(",");

    columnHeading.innerHTML = '';
    columns?.forEach((column) => {
      const headingCell = document.getElementById('table-general-heading-cell').content.cloneNode(true);
      headingCell.querySelector('th').textContent = this.labels?.values?.[column];
      columnHeading.append(headingCell);
    });
  }

  setData() {
    /* Set the caption id and connect the wrapper to it */
    const tableWrapper = this.shadowRoot.querySelector('.table-ui-wrapper[role="region"]');
    const tableCaption = this.shadowRoot.querySelector('table.table-ui caption');
    tableCaption.setAttribute('id', this.id);
    tableWrapper.setAttribute('aria-labelledby', this.id);

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

  renderComponent() {
    this.setTitle();
    this.setData();
  }
}

customElements.define('table-general', TableGeneral);
