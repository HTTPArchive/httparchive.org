import { DataUtils } from "../techreport/utils/data";
import { UIUtils } from "../techreport/utils/ui.js";
import { Constants } from "../techreport/utils/constants.js";

function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;

}

function setIcon(icon) {
  const img = document.querySelector('h1 .title-img');
  const imgUrl = `${Constants.apiBase}/static/icons/${icon}`;
  img.setAttribute('style', `background-image: url(${imgUrl})`);
}

function setCategories(categories) {
  if(categories?.length > 0) {
    /* Fetch the category list element and empty it. */
    const list = document.querySelector('.intro .category-list');
    list.innerHTML = '';

    /* Get the first 5 elements of the array */
    const _categories = categories.slice(0,5);
    _categories.forEach((category)  => {
      const cellTemplate = document.createElement('li');
      cellTemplate.className = 'cell btn';
      const link = document.createElement('a');
      link.textContent = category;
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('category', category);
      const tech = urlParams.get('tech');
      if (tech) {
        urlParams.delete('tech');
        urlParams.set('selected', tech);
      }
      link.href=`/reports/techreport/category?${urlParams.toString()}`;
      cellTemplate.appendChild(link);
      list.appendChild(cellTemplate);
    });

    /* If there are more than 5 categories, show a message */
    if(categories.length > 5) {
      const more = categories.length - 5;
      const cellTemplate = document.createElement('li');
      cellTemplate.textContent = `+ ${more} more`;
      list.appendChild(cellTemplate);
    }
  } else {
    const list = document.querySelector('.intro .category-list');
    list.remove();
  }
}

function setDescription(description) {
  if(description && description !== "") {
    const descr = document.querySelector('p.app-description');
    descr.textContent = description;
  } else {
    const descr = document.querySelector('p.app-description');
    descr.remove();
  }
}

function updateFilterMeta(filters) {
  const geo = filters?.geo || 'ALL';
  const rank = filters?.rank || 'ALL';
  const tech = filters?.app ? filters.app.join(', ') : 'ALL';
  const client = filters?.client || 'Mobile';

  document.querySelectorAll('[data-slot="geo"]').forEach(el => { el.textContent = geo; });
  document.querySelectorAll('[data-slot="rank"]').forEach(el => { el.textContent = rank; });
  document.querySelectorAll('[data-slot="tech"]').forEach(el => { el.textContent = tech; });
  document.querySelectorAll('[data-slot="client"]').forEach(el => { el.textContent = UIUtils.capitalizeFirstLetter(client); });

  if (filters?.app?.length) {
    const count = filters.app.length;
    const techWord = count === 1 ? 'technology' : 'technologies';
    document.querySelectorAll('[data-slot="techs-count"]').forEach(el => {
      el.textContent = `${count} ${techWord}`;
    });
  }
}

function update(filters) {
  const app = filters.app[0];

  if(app) {
    const formattedApp = DataUtils.formatAppName(app);
    setTitle(formattedApp);
  }

  updateFilterMeta(filters);
}

export const DrilldownHeader = {
  update,
  updateFilterMeta,
  setCategories,
  setDescription,
  setIcon,
}
