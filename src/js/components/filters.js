function updateTechnologies(technologies, filters) {
  const select = document.querySelector('select#tech');
  select.innerHTML = '';
  technologies.forEach((technology) => {
    const optionTmpl = document.getElementById('filter-option').content.cloneNode(true);
    const option = optionTmpl.querySelector('option');
    const formattedTech = technology.app.replaceAll(" ", "-");
    option.textContent = technology.app;
    option.value = formattedTech;
    if(formattedTech === filters.app[0]) {
      option.selected = true;
    }
    select.append(optionTmpl);
  });
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

export const Filters = {
  updateTechnologies,
  updateGeo,
  updateRank,
}
