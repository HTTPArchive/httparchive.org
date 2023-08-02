function updateTechnologies(technologies, filters) {
  /* Get existing tech selectors on the page */
  const allTechSelectors = document.querySelectorAll('select.tech');

  /* Update the options inside all of the selectors */
  allTechSelectors.forEach(techSelector => {
    techSelector.innerHTML = '';

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
  })
}

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

function bindFilterListener() {
  const submit = document.getElementById('submit-form');
  if(submit) {
    submit.addEventListener('click', setFilter);
  }

  const add = document.getElementById('add-tech');
  if(add) {
    add.addEventListener('click', addTechnologySelector);
  }
}

function addTechnologySelector(event) {
  event.preventDefault();

  const selectorTemplate = document.getElementById('tech-selector').content.cloneNode(true);
  const selectElement = selectorTemplate.querySelector('select');
  const labelElement = selectorTemplate.querySelector('label');
  const techId = `tech-${document.querySelectorAll('select.tech[name="tech"]').length + 1}`;
  selectElement.setAttribute('id', techId);
  labelElement.setAttribute('for', techId);

  selectElement.innerHTML = document.querySelector('select.tech').innerHTML;
  const firstOption = selectElement.querySelector('option');
  firstOption.selected = true;

  const techs = document.getElementsByName('tech');
  const last = techs[techs.length - 1];

  last.after(selectorTemplate);
}

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

export const Filters = {
  bindFilterListener,
  updateTechnologies,
  updateGeo,
  updateRank,
}
