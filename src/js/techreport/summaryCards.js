/* Summary cards.
 * Show static values for given metrics.
 */

class SummaryCard {
  constructor(id, config, filters, data) {
    this.data = data;
    this.id = id;
    this.pageConfig = config;
    this.pageFilters = filters;
    this.client = 'mobile'; //TODO: get default from config
  }

  updateContent() {
    if(this.data) {
      // Select the HTML element that corresponds with this card
      const query = `[data-component="summaryCard"][data-id="${this.id}"]`;
      const card = document.querySelector(query);

      // Get the latest data for the selected app/tech
      const app = this.pageFilters.app[0];
      const client = this.client;

      const filteredData = this.data?.[app]?.filter(entry => entry.client === client);
      filteredData?.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = filteredData[0];

      // Select value based on a pre-defined metric
      const metric = card.dataset.metric;
      const value = latest[metric];

      if(value) {
        card.querySelector('[data-slot="value"]').innerHTML = value;
      }
    }

  }

}

export default SummaryCard;
