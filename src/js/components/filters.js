const { DataUtils } = require("../techreport/utils/data");
class Filters {
  constructor(filterData, filters) {
    this.categories = filterData?.categories;
    this.technologies = filterData?.technologies;
    this.geos = filterData?.geos;
    this.ranks = filterData?.ranks;

    this.filters = filters;

    this.bindFilterListener();
  }

  /* Add event listeners to the interactive components */
  bindFilterListener() {
    /* Submit the form */
    const submit = document.getElementById('submit-form');
    if(submit) {
      submit.addEventListener('click', this.setFilter);
    }

    /* Add a new technology */
    const addButton = document.getElementById('add-tech');
    if(addButton) {
      addButton.addEventListener('click', this.addTechnologySelector);
    }

    /* Remove a technology */
    const removeButtons = Object.values(document.getElementsByClassName('remove-tech'));
    removeButtons?.forEach(removeButton => removeButton.addEventListener('click', this.removeTechnology));

    /* Choose a category */
    const categoriesSelectors = Object.values(document.getElementsByClassName('categories-selector'));
    categoriesSelectors.forEach((categorySelector) => {
      categorySelector.addEventListener('change', (event) => this.updateCategory(event));
    });
  }

  /* Submit form */
  setFilter(event) {
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
    technologies = technologies.join(",");

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
  updateTechnologies() {
    this.technologies = DataUtils.filterDuplicates(this.technologies, 'technology');

    /* Get existing tech selectors on the page */
    const allTechSelectors = document.querySelectorAll('select.tech');
    const techNames = this.technologies.map(element => element.app);

    /* Update the options inside all of the selectors */
    allTechSelectors.forEach(techSelector => {
      techSelector.innerHTML = '';

      /* If the technology doesn't exist, throw a warning */
      const techNamesFiltered = techNames;
      if(!techNamesFiltered) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Technology not found, please select a different one';
        techSelector.before(errorMsg);
      }

      /* Add one option per technology */
      this.technologies.forEach((technology) => {
        const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
        const option = optionTmpl.querySelector('option');
        const formattedTech = technology.technology;
        option.textContent = technology.technology;
        option.value = formattedTech;
        if(formattedTech === techSelector.getAttribute('data-selected')) {
          option.selected = true;
        }
        techSelector.append(optionTmpl);
      });
    });
  }

  /* Update the list with geographies */
  updateGeo() {
    const select = document.querySelector('select#geo');
    select.innerHTML = '';
    this.geos.forEach((geo) => {
      const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
      const option = optionTmpl.querySelector('option');
      const formattedTech = geo.geo;
      option.textContent = geo.geo;
      option.value = formattedTech;
      if(formattedTech === this.filters.geo) {
        option.selected = true;
      }
      select.append(optionTmpl);
    });
  }

  /* Update the list with ranks */
  updateRank() {
    const select = document.querySelector('select#rank');
    select.innerHTML = '';
    this.ranks.forEach((rank) => {
      const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
      const option = optionTmpl.querySelector('option');
      const formattedTech = rank.rank;
      option.textContent = rank.rank;
      option.value = formattedTech;
      if(formattedTech === this.filters.rank) {
        option.selected = true;
      }
      select.append(optionTmpl);
    });
  }

  /* Update the list with categories */
  updateCategories() {
    const selects = document.querySelectorAll('select[name="categories"]');

    if(this.categories) {
      selects.forEach(select => {
        select.innerHTML = '';

        const all = document.createElement('option');
        all.value = 'ALL';
        all.innerHTML = 'ALL';
        select.append(all);

        this.categories.forEach((category) => {
          const option = document.createElement('option');
          option.value = category.category;
          option.innerHTML = category.category;
          select.append(option);
        });
      })
    }
  }

  /* Set the selected category */
  updateCategory(event) {
    // Get the techs associated with the selected category
    const selectedCategory = this.categories.find(category => category.category === event.target.value);
    const selectedTechs = selectedCategory?.technologies;
    console.log(selectedCategory, selectedTechs);

    // Get the component with the selected tech
    const techSelector = document.getElementById(event.target.dataset.tech);
    techSelector.innerHTML = '';

    // Update the options
    selectedTechs.forEach((technology) => {
      const option = document.createElement('option');
      option.textContent = technology;
      option.value = technology;
      if(technology === techSelector.getAttribute('data-selected')) {
        option.selected = true;
      }
      techSelector.append(option);
    });

  }

  /* Duplicate the technology dropdowns */
  addTechnologySelector(event) {
    event.preventDefault();

    const selectorTemplate = document.getElementById('tech-selector').content.cloneNode(true);

    const selectElement = selectorTemplate.querySelector('select.tech');
    const labelElement = selectorTemplate.querySelector('label.tech');
    const removeButton = selectorTemplate.querySelector('.remove-tech');

    const categorySelect = selectorTemplate.querySelector('select.categories-selector');
    const categoryLabel = selectorTemplate.querySelector('label[for="categories-tech-new"]');
    categorySelect.innerHTML = document.querySelector('select.categories-selector').innerHTML;
    categorySelect.addEventListener('change', this.updateCategory);

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
    removeButton.addEventListener('click', this.removeTechnology);

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
  removeTechnology(event) {
    event.preventDefault();

    /* Remove the tech selector group from the DOM */
    const tech = document.querySelector(`.tech-selector-group[data-tech="${event.target.dataset.tech}"]`);
    tech.remove();

    /* Don't show any remove buttons if there is only one element left */
    this.hideRemoveButton();
  }

  /* Hide possibility to remove tech when only one is selected */
  hideRemoveButton() {
    const techs = document.getElementsByClassName('tech-selector-group');
    if(techs.length === 1) {
      techs[0].getElementsByClassName('remove-tech')[0].classList.add('hidden');
    }
  }
}

export default Filters;
