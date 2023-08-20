import { getLatestEntry } from "../utils";

/*
 * Table comparing data between different technologies.
 * Dataset: Based on selected metric (CWV, lighthouse, etc.)
 * Columns: Selected technologies.
 * Rows: Time entries.
 */
class tableGenralMulti extends HTMLElement {
  constructor() {
    super();

    this.allData = [];
    this.technologies = '';
    this.client = 'mobile';
    this.metric = 'origins';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-general-multitech').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['loaded', 'client', 'all_data', 'technologies', 'metric', 'id'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    this.renderComponent();
  }

  setData() {
    /* Turn the techs into an array */
    const technologies = this.technologies?.split(",");

    /* Select the elements within the component */
    const tableHead = this.shadowRoot.querySelector('table.table-ui thead tr');
    const tableBody = this.shadowRoot.querySelector('table.table-ui tbody');
    const tableCaption = this.shadowRoot.querySelector('table.table-ui caption');
    const tableWrapper = this.shadowRoot.querySelector('.table-ui-wrapper[role="region"]');

    /* Set the caption id and connect the wrapper to it */
    tableCaption.setAttribute('id', this.id);
    tableWrapper.setAttribute('aria-labelledby', this.id);

    /* Reset the component */
    tableBody.innerHTML = '';
    tableHead.innerHTML = '';

    /* Set the date heading */
    const dateHeading = document.createElement('th');
    dateHeading.innerHTML = 'Date';
    tableHead.append(dateHeading);

    const _dates = [];

    technologies.forEach(technology => {
      /* Fill in the tech names as column headings. */
      const headingCellTemplate = document.getElementById('table-general-heading-cell').content.cloneNode(true);
      headingCellTemplate.querySelector('th').textContent = technology;
      tableHead.append(headingCellTemplate);

      /* TODO: This could be done in a central place after fetching the data */
      /* Add the dates to the dates array */
      const _data = this.allData?.[technology]?.filter(entry => entry.client === this.client);

      _data?.forEach(entry => {
        if(!_dates.includes(entry.date)) {
          _dates.push(entry.date);
        }
      });
    });

    /* Add a row to the table body for each of the time entries */
    _dates.forEach(date => {
      /* Select the needed templates */
      const rowTemplate = document.getElementById('table-general-row').content.cloneNode(true);
      const headingCellTemplate = document.getElementById('table-general-heading-cell').content.cloneNode(true);

      /* Fill in the dates */
      headingCellTemplate.querySelector('th').textContent = date;
      rowTemplate.append(headingCellTemplate);

      /* For each of the technologies, select the chosen metric for the given date */
      technologies.forEach(technology => {
        const dataCellTemplate = document.getElementById('table-general-cell').content.cloneNode(true);
        const _data = this.allData?.[technology]?.filter(entry => entry.client === this.client)?.find(row => row.date = date);

        dataCellTemplate.querySelector('td').textContent = _data ? _data[this.metric] : '-';
        rowTemplate.append(dataCellTemplate);
      });

      /* Append the row to the table */
      tableBody.append(rowTemplate);
    });
  }

  renderComponent() {
    this.setData();
  }
}

customElements.define('table-general-multitech', tableGenralMulti);
