import { getLatestEntry } from "../utils";

class TableOverview extends HTMLElement {
  constructor() {
    super();

    this.latest = {};
    this.allData = [];
    this.focus = 'mobile';

    this.attachShadow({ mode: 'open' });
    const template = document.getElementById('table-overview').content.cloneNode(true);
    this.shadowRoot.appendChild(template);
  }

  connectedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['loaded', 'focus'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[ property ] = newValue;
    this.renderComponent();
  }

  setTitle() {

  }

  setData() {
    const focusedData = this.allData.filter(entry => entry.client === this.focus);
    const latestFocus = getLatestEntry(focusedData);

    const tableBody = this.shadowRoot.querySelector('table.table-ui tbody');

    const coreWebVitals = [
      {
        origins_with_good: "origins_with_good_cwv",
        origins_eligible: "origins_eligible_for_cwv",
        title: "Overall"
      },
      {
        origins_with_good: "origins_with_good_fid",
        origins_eligible: "origins_with_any_fid",
        title: "FID"
      }
    ];

    coreWebVitals.forEach((cwv) => {
      const rowTemplate = document.getElementById('table-overview-row').content.cloneNode(true);

      console.log(latestFocus, latestFocus[cwv.origins_with_good]);

      rowTemplate.querySelector('tr th').textContent = cwv.title;
      rowTemplate.querySelectorAll('tr td')[0].textContent = `${parseInt(latestFocus[cwv.origins_with_good] / latestFocus[cwv.origins_eligible] * 1000) / 100}%`;

      focusedData.reverse().forEach((entry) => {
        const barTemplate = document.getElementById('table-overview-bar').content.cloneNode(true);
        rowTemplate.querySelectorAll('tr td')[1].append(barTemplate);
      })
      tableBody.append(rowTemplate);
    });
  }

  renderComponent() {
    this.setTitle();
    this.setData();
  }
}

customElements.define('table-overview', TableOverview);
