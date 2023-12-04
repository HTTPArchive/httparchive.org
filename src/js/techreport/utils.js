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

export const Utils = {
  getAppColor,
}
