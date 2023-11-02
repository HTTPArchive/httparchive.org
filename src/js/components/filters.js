/* Add event listeners to the interactive components */
function bindFilterListener() {
  /* Submit the form */
  const submit = document.getElementById('submit-form');
  if(submit) {
    submit.addEventListener('click', setFilter);
  }

  /* Add a new technology */
  const addButton = document.getElementById('add-tech');
  if(addButton) {
    addButton.addEventListener('click', addTechnologySelector);
  }

  /* Remove a technology */
  const removeButtons = Object.values(document.getElementsByClassName('remove-tech'));
  removeButtons?.forEach(removeButton => removeButton.addEventListener('click', removeTechnology));

  /* Choose a category */
  const categoriesSelectors = Object.values(document.getElementsByClassName('categories-selector'));
  categoriesSelectors.forEach(categorySelector => categorySelector.addEventListener('change', updateCategory));
}

/* Submit form */
function setFilter(event) {
  event.preventDefault();

  const url = new URL(location.href);

  /* Get the geo and rank filter */
  const geo = document.getElementsByName('geo')[0].value;
  const rank = document.getElementsByName('rank')[0].value;

  /* Create a string of technologies */
  let technologies = [];
  document.getElementsByName('tech').forEach(technology => {
    technologies.push(technology.value);
  });
  technologies.join(",");

  /* Modify the URL with the tech */
  url.searchParams.delete('tech');
  url.searchParams.append('tech', technologies);

  url.searchParams.delete('geo');
  url.searchParams.append('geo', geo);

  url.searchParams.delete('rank');
  url.searchParams.append('rank', rank);


  /* Update the url */
  location.href = url;
}

/* Update the list of technologies */
function updateTechnologies(technologies) {
  /* Get existing tech selectors on the page */
  const allTechSelectors = document.querySelectorAll('select.tech');
  const techNames = technologies.map(element => element.app);

  /* Update the options inside all of the selectors */
  allTechSelectors.forEach(techSelector => {
    techSelector.innerHTML = '';

    const selectedTechFormatted = techSelector.getAttribute('data-selected').replaceAll('-', ' ');

    /* If the technology doesn't exist, throw a warning */
    if(!techNames.includes(selectedTechFormatted)) {
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Technology not found, please select a different one';
      techSelector.before(errorMsg);
    }

    /* Add one option per technology */
    technologies.forEach((technology) => {
      const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
      const option = optionTmpl.querySelector('option');
      const formattedTech = technology.app.replaceAll(" ", "-");
      option.textContent = technology.app;
      option.value = formattedTech;
      if(formattedTech === techSelector.getAttribute('data-selected')) {
        option.selected = true;
      }
      techSelector.append(optionTmpl);
    });
  });

  // hideRemoveButton();
}

/* Update the list with geographies */
function updateGeo(geos, filters) {
  const select = document.querySelector('select#geo');
  select.innerHTML = '';
  geos.forEach((geo) => {
    const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
    const option = optionTmpl.querySelector('option');
    const formattedTech = geo.geo.replaceAll(" ", "-");
    option.textContent = geo.geo;
    option.value = formattedTech;
    if(formattedTech === filters.geo) {
      option.selected = true;
    }
    select.append(optionTmpl);
  });
}

/* Update the list with ranks */
function updateRank(ranks, filters) {
  const select = document.querySelector('select#rank');
  select.innerHTML = '';
  ranks.forEach((rank) => {
    const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
    const option = optionTmpl.querySelector('option');
    const formattedTech = rank.rank.replaceAll(" ", "-");
    option.textContent = rank.rank;
    option.value = formattedTech;
    if(formattedTech === filters.rank) {
      option.selected = true;
    }
    select.append(optionTmpl);
  });
}

/* Update the list with categories */
function updateCategories(categories, filters) {
  console.log('try to update categories', categories);
  const selects = document.querySelectorAll('select[name="categories"]');

  if(categories) {
    selects.forEach(select => {
      console.log(categories, 'categories exist, set select stuff', select)
      select.innerHTML = '';

      const all = document.createElement('option');
      all.value = 'ALL';
      all.innerHTML = 'ALL';
      select.append(all);

      Object.keys(categories).forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.innerHTML = category;
        option.dataset.technologies = categories[category].join(',');
        select.append(option);
      });

      console.log('select when we are done', select);
    })
  }
}

/* Set the selected category */
function updateCategory(event) {
  console.log('update category');
  const selectedOption = document.querySelector(`option[value="${event.target.value}"]`);
  const selectedTechs = selectedOption.dataset.technologies.split(",");
  const techSelector = document.getElementById(event.target.dataset.tech);
  techSelector.innerHTML = '';

  console.log(selectedOption, selectedTechs, techSelector);

  selectedTechs.forEach((technology) => {
    const option = document.createElement('option');
    const formattedTech = technology.replaceAll(" ", "-");
    option.textContent = technology;
    option.value = formattedTech;
    if(formattedTech === techSelector.getAttribute('data-selected')) {
      option.selected = true;
    }
    techSelector.append(option);
  });

}

/* Duplicate the technology dropdowns */
function addTechnologySelector(event) {
  event.preventDefault();

  console.log('add a tech selector');

  const selectorTemplate = document.getElementById('tech-selector').content.cloneNode(true);

  const selectElement = selectorTemplate.querySelector('select.tech');
  const labelElement = selectorTemplate.querySelector('label.tech');
  const removeButton = selectorTemplate.querySelector('.remove-tech');

  const categorySelect = selectorTemplate.querySelector('select.categories-selector');
  const categoryLabel = selectorTemplate.querySelector('label[for="categories"]');
  categorySelect.innerHTML = document.querySelector('select.categories-selector').innerHTML;
  categorySelect.addEventListener('change', updateCategory);

  console.log(selectElement, labelElement);

  /* Set a unique name on the new element (based on the amount of techs) */
  const techId = `tech-${document.querySelectorAll('select.tech[name="tech"]').length + 1}`;
  selectElement.setAttribute('id', techId);
  labelElement.setAttribute('for', techId);
  removeButton.dataset.tech = techId;

  categorySelect.setAttribute('id', `${techId}-category`);
  categoryLabel.setAttribute('for', `${techId}-category`);
  categorySelect.setAttribute('data-tech', techId);

  removeButton.classList.remove('hidden');

  /* Bind functionality to the button */
  removeButton.addEventListener('click', removeTechnology);

  /* Fill in all techs and select the first one */
  selectElement.innerHTML = document.querySelector('select.tech').innerHTML;
  selectElement.getElementsByTagName('option')[0].selected = true;

  categorySelect.innerHTML = document.querySelector('select.categories-selector')?.innerHTML;
  categorySelect.getElementsByTagName('option')[0].selected = true;

  /* Add the new tech to the end of the list */
  const techs = document.getElementsByClassName('tech-selector-group');
  const last = techs[techs.length - 1];
  last.after(selectorTemplate);

  /* If this is there are 2 or more technologies, the first one can be removed too */
  if(techs.length === 2) {
    techs[0].getElementsByClassName('remove-tech')[0].classList.remove('hidden');
  }
}

/* Remove the chosen technology option */
function removeTechnology(event) {
  event.preventDefault();

  console.log(event.target.dataset);

  /* Remove the tech selector group from the DOM */
  const tech = document.querySelector(`.tech-selector-group[data-tech="${event.target.dataset.tech}"]`);
  tech.remove();

  /* Don't show any remove buttons if there is only one element left */
  hideRemoveButton();
}

/* Hide possibility to remove tech when only one is selected */
function hideRemoveButton() {
  const techs = document.getElementsByClassName('tech-selector-group');
  if(techs.length === 1) {
    techs[0].getElementsByClassName('remove-tech')[0].classList.add('hidden');
  }
}

export const Filters = {
  bindFilterListener,
  updateTechnologies,
  updateGeo,
  updateRank,
  updateCategories,
}
