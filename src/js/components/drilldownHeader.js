function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;
}

function setCategories(categories) {
  if(categories.length > 0) {
    /* Fetch the category list element and empty it. */
    const list = document.querySelector('.intro .category-list');
    list.innerHTML = '';

    /* Get the first 5 elements of the array */
    const _categories = categories.slice(0,5);
    _categories.forEach((category)  => {
      const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
      cellTemplate.querySelector('li.cell').textContent = category;
      list.appendChild(cellTemplate);
    });

    /* If there are more than 5 categories, show a message */
    if(categories.length > 5) {
      const more = categories.length - 5;
      const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
      cellTemplate.querySelector('li.cell').textContent = `+ ${more} more`;
      list.appendChild(cellTemplate);
    }
  }
}

function update(data, filters) {
  const app = filters.app[0];
  setTitle(app);
  setCategories(data[app][0]?.category?.split(", "));
}

export const DrilldownHeader = {
  update,
}
