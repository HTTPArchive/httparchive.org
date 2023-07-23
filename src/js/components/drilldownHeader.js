function setTitle(title) {
  const mainTitle = document.querySelector('h1 span.main-title');
  mainTitle.textContent = title;
}

function setCategories(categories) {
  if(categories.length > 0) {
    const list = document.querySelector('.intro .category-list');
    list.innerHTML = '';
    categories.forEach((category)  => {
      const cellTemplate = document.getElementById('category-cell').content.cloneNode(true);
      cellTemplate.querySelector('li.cell').textContent = category;
      list.appendChild(cellTemplate);
    });
  }
}

function update(data, filters) {
  const app = filters.app[0];
  setTitle(app);
  setCategories(data[app][0]?.category?.split(","));
}

export const DrilldownHeader = {
  update,
}
