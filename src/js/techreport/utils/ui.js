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
const updateReportComponents = (sections, data) => {
  // Update sections
  Object.values(sections).forEach(section => {
    section.data = data;
    section.pageFilters = {
      ...section.pageFilters,
      app: Object.keys(data),
    };
    section.updateSection();
  });
}

const getChangeStatus = (percentage, meaning) => {
  if(percentage > 0) {
    const color = meaning === 'inverted' ? 'bad' : 'good';
    return {
      direction: 'positive',
      color: color,
    }
  }

  if(percentage < 0) {
    const color =  meaning === 'inverted' ? 'good' : 'bad';
    return {
      direction: 'negative',
      color: color,
    }
  }

  return {
    direction: 'equal',
    color: 'neutral'
  }
}

function capitalizeFirstLetter(theString) {
  return theString && typeof theString === 'string' ? theString.charAt(0)?.toUpperCase() + theString.slice(1) : theString;
}

function printMonthYear(theDate) {
  if (!theDate || theDate.length != 10) return;

  const [year, month] = theDate.split('-');
  const date = new Date(year, month - 1);
  const formattedDate = date.toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  return formattedDate;
}

export const UIUtils = {
  getAppColor,
  updateReportComponents,
  getChangeStatus,
  capitalizeFirstLetter,
  printMonthYear,
}
