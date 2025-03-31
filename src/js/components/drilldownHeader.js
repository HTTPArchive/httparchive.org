import { DataUtils } from "../techreport/utils/data";

function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;

  const img = document.createElement('img');
  const imgUrl = `https://cdn.httparchive.org/static/icons/${title}.png`;
  img.setAttribute('aria-hidden', 'true');
  img.setAttribute('alt', '');
  img.setAttribute('src', imgUrl);
  img.classList.add('title-img');
  mainTitle.append(img);
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
      cellTemplate.className = 'cell';
      cellTemplate.textContent = category;
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
}
