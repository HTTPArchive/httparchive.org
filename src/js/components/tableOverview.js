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
    const focusedDataSorted = [...focusedData].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    const latestFocus = getLatestEntry(focusedData);

    const tableBody = this.shadowRoot.querySelector('table.table-ui tbody');

    const coreWebVitals = [
      {
        origins_with_good: "origins_with_good_cwv",
        origins_eligible: "origins_eligible_for_cwv",
        title: "Overall",
      },
      {
        origins_with_good: "origins_with_good_lcp",
        origins_eligible: "origins_with_any_lcp",
        title: "Largest Contentful Paint",
      },
      {
        origins_with_good: "origins_with_good_fid",
        origins_eligible: "origins_with_any_fid",
        title: "First Input Delay",
      },
      {
        origins_with_good: "origins_with_good_cls",
        origins_eligible: "origins_with_any_cls",
        title: "Cumulative Layout Shift",
      },
      {
        origins_with_good: "origins_with_good_inp",
        origins_eligible: "origins_with_any_inp",
        title: "Interaction to Next Paint",
      },
    ];

    coreWebVitals.forEach((cwv) => {
      const rowTemplate = document.getElementById('table-overview-row').content.cloneNode(true);
      const latestPercentageGood = parseInt(latestFocus[cwv?.origins_with_good] / latestFocus[cwv?.origins_eligible] * 10000) / 100;
      rowTemplate.querySelector('tr th').textContent = cwv.title;
      rowTemplate.querySelectorAll('tr td')[0].textContent = `${latestPercentageGood}%`;

      focusedDataSorted.forEach((entry) => {
        const barTemplate = document.getElementById('table-overview-bar').content.cloneNode(true);
        const percentageGood = parseInt(entry[cwv?.origins_with_good] / latestFocus[cwv?.origins_eligible] * 10000) / 100;
        const date = entry.date;
        barTemplate.querySelector('li.bar').style.setProperty('--height', `${percentageGood}%`);
        barTemplate.querySelector('li.bar .sr-only').textContent = `${date}: ${percentageGood}%`;
        rowTemplate.querySelector('tr td ul.table-bar-preview').append(barTemplate);
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
