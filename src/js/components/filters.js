import ComboBox from "../techreport/combobox";

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
    const categories = document.getElementsByName('categories')[0]?.value;

    /* Create a string of technologies */
    let technologies = [];
    document.getElementsByName('tech').forEach(technology => {
      technologies.push(technology.value);
    });
    technologies = technologies.join(",");

    /* Modify the URL with the tech */
    url.searchParams.delete('tech');
    if (technologies.length > 0) {
      url.searchParams.append('tech', technologies);
    } else {
      url.searchParams.append('tech', 'ALL');
    }

    url.searchParams.delete('geo');
    url.searchParams.append('geo', geo);

    url.searchParams.delete('rank');
    url.searchParams.append('rank', rank);

    if(categories) {
      url.searchParams.delete('category');
      url.searchParams.append('category', categories);
    }

    // Reset to page 1 when filters change
    url.searchParams.delete('page');
    url.searchParams.append('page', '1');

    // /* Scroll to the report content */
    // url.hash = '#report-content';

    /* Update the url */
    const styledUrl = url.href.replaceAll('%2C', ',');
    location.href = styledUrl;
  }

  /* Update the list of technologies */
  updateTechnologies() {
    /* Get existing tech selectors on the page */
    const allTechSelectors = document.querySelectorAll('select[name="tech"]');

    /* Update the options inside all of the selectors */
    allTechSelectors.forEach(techSelector => {
      techSelector.innerHTML = '';

      /* If the technology doesn't exist, throw a warning */
      if(!this.technologies) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Technology not found, please select a different one';
        techSelector.before(errorMsg);
      }

      /* Get a list of technologies */
      const techs = this.technologies;

      /* Add one option per technology */
      if(document.getElementById('filter-option')) {
        techs.forEach((technology) => {
          const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
          const option = optionTmpl.querySelector('option');
          const formattedTech = DataUtils.formatAppName(technology);
          option.textContent = formattedTech;
          option.value = technology;
          if(formattedTech === techSelector.getAttribute('data-selected')) {
            option.selected = true;
          }
          techSelector.append(optionTmpl);
        });
      }
    });

    const combo = document.querySelectorAll('[data-component="combobox"]');
    const url = new URL(location.href);
    const selected = url.searchParams.get('tech')?.split(',') || ["ALL"];
    combo.forEach(box => new ComboBox(box, this.technologies, selected));
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
    const selects = document.querySelectorAll('select[name="categories"]') || document.querySelectorAll('select[name="category"]');

    if(this.categories) {
      selects.forEach(select => {
        select.innerHTML = '';

        const all = document.createElement('option');
        all.value = 'ALL';
        all.textContent = 'ALL';
        select.append(all);

        const sortedCategories = this.categories.sort((a, b) => a !== b ? a < b ? -1 : 1 : 0);
        sortedCategories.forEach((category) => {
          const option = document.createElement('option');
          if(category === select.getAttribute('data-selected')) {
            option.selected = true;
          }
          option.value = category;
          option.textContent = category;
          select.append(option);
        });
      })
    }
  }

  /* Set the selected category */
  updateCategory(event) {
    // Get the techs associated with the selected category
    const selectedCategory = this.categories.find(category => category.category === event.target.value);
    let selectedTechs = selectedCategory?.technologies || [];
    if(event.target.value === 'ALL') {
      selectedTechs = this.technologies.map(technology => technology.technology);
    }

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

    /* Set a unique name on the new element (based on the amount of techs) */
    const techCount = document.querySelectorAll('select.tech[name="tech"]').length;
    const techNr = techCount + 1;
    const techId = `tech-${techNr}`;
    const techLabel = `Technology ${techNr}`;
    selectElement.setAttribute('id', techId);
    selectElement.removeAttribute('disabled');
    labelElement.setAttribute('for', techId);
    labelElement.textContent = techLabel;

    if(removeButton) {
      removeButton.dataset.tech = techId;
      removeButton.classList.remove('hidden');

      const removeIcon = removeButton.querySelector('img');
      const removeIconAlt = removeIcon.getAttribute('alt');
      removeIcon.setAttribute('alt', `${removeIconAlt} ${techLabel}`);

      /* Bind functionality to the button */
      removeButton.addEventListener('click', this.removeTechnology);
    }

    /* Fill in all techs and select the first one */
    selectElement.innerHTML = document.querySelector('select.tech').innerHTML;
    selectElement.getElementsByTagName('option')[0].selected = true;

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
