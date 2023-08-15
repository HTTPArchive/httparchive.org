import { getLatestEntry } from "../utils";

/*
 * Core Web Vitals overview table for multiple technologies.
 * Uses the latest data for each of the technologies.
 * Columns: Core Web Vitals breakdown
 * Rows: Selected technologies
 */
class tableCWVOverviewMulti extends HTMLElement {
  constructor() {
    super();

    this.allData = [];
    this.latest = [];
    this.technologies = '';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-cwv-overview-multitech').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['loaded', 'client', 'all_data', 'technologies'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    this.renderComponent();
  }

  setData() {
    const technologies = this.technologies?.split(",");
    const tableBody = this.shadowRoot.querySelector('table.table-ui tbody');
    tableBody.innerHTML = '';

    /* Define keys for the different core web vitals */
    const coreWebVitals = [
      {
        origins_with_good: "origins_with_good_cwv",
        origins_eligible: "origins_eligible_for_cwv",
      },
      {
        origins_with_good: "origins_with_good_lcp",
        origins_eligible: "origins_with_any_lcp",
      },
      {
        origins_with_good: "origins_with_good_cls",
        origins_eligible: "origins_with_any_cls",
      },
      {
        origins_with_good: "origins_with_good_fid",
        origins_eligible: "origins_with_any_fid",
      },
      {
        origins_with_good: "origins_with_good_inp",
        origins_eligible: "origins_with_any_inp",
      },
    ];

    technologies.forEach(technology => {
      /* Select the data for each of the technologies */
      const _data = this.allData?.[technology];

      /* If the data exits, fill in the table */
      if(_data) {
        /* Get the data for the selected client, and get the latest entry */
        const _clientData = _data?.filter(entry => entry.client === this.client);
        const _clientDataSorted = [..._clientData]?.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });
        const _latest = getLatestEntry(_clientDataSorted);

        /* Fill in the tech names as row headings */
        const row = document.createElement('tr');
        const headingCell = document.createElement('th');
        const technologyLinkEl = document.createElement('a');
        technologyLinkEl.className = 'row-link';
        technologyLinkEl.href = `/reports/techreport/drilldown/?tech=${technology}`;
        technologyLinkEl.innerHTML = technology;
        headingCell.append(technologyLinkEl);
        row.append(headingCell);

        /* Fill in amount of origins tech has */
        const origins = document.createElement('td');
        origins.innerHTML = _latest.origins;
        row.append(origins);

        /* Fill in the data for each of the core web vitals */
        coreWebVitals.forEach(cwv => {
          const dataCell = document.createElement('td');
          const percentageGood = parseInt(_latest[cwv?.origins_with_good] / _latest[cwv?.origins_eligible] * 10000) / 100;
          dataCell.innerHTML = `${percentageGood}%`;
          row.append(dataCell);
        })

        /* Add the row to the table body */
        tableBody.append(row);

        /* Show the latest timestamp */
        this.shadowRoot.querySelector('.timestamp').innerHTML = _latest.date;
      }
    });

  }

  renderComponent() {
    this.setData();
  }
}

customElements.define('table-cwv-overview-multitech', tableCWVOverviewMulti);
