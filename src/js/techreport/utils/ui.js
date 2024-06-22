// Get the color associated with the techology
// Based on the order of the technologies
// To ensure the color is consistent per query
const getAppColor = (tech, technologies, colors) => {
  const sortedTechs = [...technologies].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const techIndex = sortedTechs.indexOf(tech);

  // Get color scheme
  const theme = document.querySelector('html').dataset.theme;

  // Return custom colors if configured
  if(colors.overrides && colors.overrides[tech]) {
    return colors.overrides[tech];
  }

  // Otherwise reutrn based on alphabetic position
  if(techIndex < colors.app.length) {
    const appColors = theme === "dark" ? colors.app_dark : colors.app;
    return appColors[techIndex];
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
}

export const UIUtils = {
  getAppColor,
  updateReportComponents,
}
