import { getLatestEntry } from "../utils";

class TableOverviewMulti extends HTMLElement {
  constructor() {
    super();

    this.allData = [];
    this.latest = [];
    this.technologies = '';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-overview-multitech').content.cloneNode(true);
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
    const latestData = [];
    const tableBody = this.shadowRoot.querySelector('table.table-ui tbody');
    tableBody.innerHTML = '';

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
      const _data = this.allData?.[technology];

      if(_data) {
        const _clientData = _data?.filter(entry => entry.client === this.client);
        const _clientDataSorted = [..._clientData]?.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        const _latest = getLatestEntry(_clientDataSorted);

        const rowTemplate = document.getElementById('table-general-row').content.cloneNode(true);
        const headingCellTemplate = document.getElementById('table-general-heading-cell').content.cloneNode(true);

        headingCellTemplate.querySelector('th').textContent = technology;
        rowTemplate.querySelector('tr').append(headingCellTemplate);

        const origins = document.getElementById('table-general-cell').content.cloneNode(true);
        origins.querySelector('td').textContent = _latest.origins;
        rowTemplate.querySelector('tr').append(origins);

        coreWebVitals.forEach(cwv => {
          const dataCellTemplate = document.getElementById('table-general-cell').content.cloneNode(true);
          const percentageGood = parseInt(_latest[cwv?.origins_with_good] / _latest[cwv?.origins_eligible] * 10000) / 100;
          dataCellTemplate.querySelector('td').textContent = `${percentageGood}%`;
          rowTemplate.querySelector('tr').append(dataCellTemplate);
        })

        tableBody.append(rowTemplate);
      }
    });

  }

  renderComponent() {
    this.setData();
  }
}

customElements.define('table-overview-multitech', TableOverviewMulti);
