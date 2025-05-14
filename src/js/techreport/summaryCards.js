/* Summary cards.
 * Show static values for given metrics.
 */

import { DataUtils } from "./utils/data";
import { UIUtils } from "./utils/ui";

class SummaryCard {
  constructor(id, pageConfig, config, filters, data) {
    this.data = data;
    this.id = id;
    this.pageConfig = pageConfig;
    this.config = config;
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
      const client = card.dataset.client || this.client;
      // const filteredData = this.data?.[app]?.filter(entry => entry.client === client);
      // filteredData?.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Select value based on a pre-defined metric
      const metric = card.dataset.metric;
      const category = card.dataset.category;
      const endpoint = card.dataset.endpoint;
      const key = card.dataset.key;

      let latestValue;
      let latestChange;

      if(key) {
        latestValue = this.data[key][metric][client] || this.data[key][metric];
      } else {
        const dataApp = this.data?.[app];
        const latestToOldest = [...dataApp].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestEndpoint = latestToOldest[0]?.[endpoint];

        if(category) {
          const latestCategory = latestEndpoint?.find(row => row.name === category)?.[client];
          if(metric) {
            latestValue = latestCategory?.[metric];
            latestChange = {
              string: latestCategory?.momString,
              perc: latestCategory?.momPerc,
            };
          } else {
            latestValue = latestCategory;
          }
        } else {
          latestValue = latestEndpoint?.[client];
        }
      }

      // Update the html
      if(latestValue) {
        const valueSlot = card.querySelector('[data-slot="value"]');
        valueSlot.innerHTML = latestValue?.toLocaleString();

        const progress = card.querySelectorAll('.progress-circle');
        progress.forEach(circle => {
          const scoreCategory = DataUtils.getLighthouseScoreCategories(latestValue, this.config.lighthouse_brackets);
          const scoreCategoryName = scoreCategory?.name;
          circle.setAttribute('style', `--offset: ${latestValue}%;`);
          circle.classList.add(scoreCategoryName);
        });
      }

      if(latestChange && latestChange.string) {
        const changeSlot = card.querySelector('[data-slot="change"]');
        const changeMeaning = changeSlot?.dataset?.meaning;

        if(changeSlot) {
          changeSlot.textContent = latestChange.string;
          const styling = UIUtils.getChangeStatus(latestChange.perc, changeMeaning);
          changeSlot.classList.add(styling.color, styling.direction);
        }
      }
    }
  }

}

export default SummaryCard;
