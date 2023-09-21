const timeseries = {};

// TODO: load data with new API instead
function init(page, pageFilters, data) {
  const sections = document.querySelectorAll('[data-type="section"]');
  Object.values(sections).forEach(section => {
    const timeseriesComponents = section.querySelectorAll('[data-component="timeseries"]');
    Object.values(timeseriesComponents).forEach(component => {
      timeseries[component.dataset.id] = new Timeseries(
        component.dataset.id,
        page.config,
        pageFilters,
        data
      );
    });
  });
}


function updateSectionWithData(section, data) {
  Object.values(timeseries).forEach(component => {
    component.data = data;
    component.updateContent();
  });
}

export const Sections = {
  init,
  updateSectionWithData
};
