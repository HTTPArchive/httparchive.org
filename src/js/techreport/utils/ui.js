// Get the color associated with the techology
// Based on the order of the technologies
// To ensure the color is consistent per query
const getAppColor = (tech, technologies, colors) => {
  const sortedTechs = [...technologies].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const techIndex = sortedTechs.indexOf(tech);

  // Return custom colors if configured
  if(colors.overrides && colors.overrides[tech]) {
    return colors.overrides[tech];
  }

  // Otherwise reutrn based on alphabetic position
  if(techIndex < colors.app.length) {
    return colors.app[techIndex];
  }
}

// Loop through all the sections in the report
// Pass in the new data and config, and re-render
const updateReportComponents = (sections, data, allData, page, labels) => {
  // Update sections
  Object.values(sections).forEach(section => {
    section.data = data;
    section.updateSection();
  });

  const allDataComponents = document.querySelectorAll('[data-scope="all-data"]');
  allDataComponents.forEach((component) => {
    component.allData = allData;
    component.page = page;
    component.labels = labels;
    component.setAttribute('loaded', true);
  });
}

export const UIUtils = {
  getAppColor,
  updateReportComponents,
}
