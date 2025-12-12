import { DataUtils } from "../techreport/utils/data";

function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;

}

function setIcon(icon) {
  const img = document.querySelector('h1 .title-img');
  const imgUrl = `https://cdn.httparchive.org/v1/static/icons/${encodeURIComponent(icon)}`;
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

function update(filters) {
  const app = filters.app[0];

  if(app) {
    const formattedApp = DataUtils.formatAppName(app);
    setTitle(formattedApp);
  }
}

export const DrilldownHeader = {
  update,
  setCategories,
  setDescription,
  setIcon,
}
