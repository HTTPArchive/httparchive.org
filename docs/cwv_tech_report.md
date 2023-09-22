# CWV Tech Report

## Set-up

See general README.md, nothing extra is required.

## How it works

The report is built using Python, HTML/CSS, and vanilla JavaScript. We're using Highcharts for the visualizations, with the export and accessibility module added (built-in table altenatives, keyboard nav, etc). The page skeleton gets built on the server side, and populated with data on the client.

### Server-side

Based on the URL, the server decides which report template to load:
- Landing
- Drilldown
- Comparison

This is currently based on `/techreport/<pageId>` in the url, but could in the future also be a combination of this and the number of technologies present in the arguments.

Each page is made out of sections (based on the metrics), that each contain a collection of visualizations. The static skeleton content for these are rendered server-side, and based on the configurations in the **`techreport.json`** file.

### Configurations

The configurations for the tech report can be found in the **`/config/techreport.json`** file. They're passed in to the JavaScript from the **`/templates/techreport.html`** file.

#### `techreport.json`

**TODO**: Example to come 🙂

### Client-side

On the client, through **`/src/js/techreport/index.js`**, the data is fetched and filled into the components on the page.

The Highcharts components (`timeseries.js`) are rendered with placeholder data (defined in the config) first, to avoid having a long period without graphs while waiting for the API.

#### Data

**Future behavior**: There will be one API per metric, which will be called from the section level.

**Current behavior**: The data currently comes from static JSONs and is fetched from inside the **`techreport/index.js`** file, and then passed on to the different sections.

#### HTML

All the HTML files are located in the `templates/techreport` folder. The top level files in that folder are the main pages that will be rendered. The `components` subfolder contains reusable bits of HTML that can be included in the pages and templates.

The `templates` subfolder contains `<template>`s used in (web)components.

```
/templates
  /techreport
    /components
      filters.html
      ...
    /templates
      table_general.html
      ...
    comparison.html
    drilldown.html
    landing.html
    ...
```

#### JavaScript

**`/src/js/techreport/index.js`** is the main JavaScript file, from where all sections/visualizations are initiated and updated, and from where the data currently gets loaded.

Different `Section` instances are created by based on the different `[data-type="section"]`s on the page.

Currently, the JSON files are fetched from within the `Techreport`, and on success the `Section`s get updated with the new data. Later this data will be fetched with an API for each `Section`.

When the data in the `Section` updates, the code updates the different components. The `Section` is responsible for fetching the data or watching section-level interactions. The components, like `Timeseries` (**`/src/js/techreport/timeseries.js`**), parse the data into the format required and then update the HTML with it.

#### Filters

**On a global level**, the data can be filtered by:
- App / technology
- Geography
- Rank

When changing any of these, the user has to submit the form, after which the data gets fetched through the API(s).

These parameters also update in the URL, which is used by the server-side code to render a page outline, and carry over between drilldown/comparison page.

**On a page level**, the selected cliented can be changed between desktop and mobile. This does not require a new API call.

**On a component level**, the selected submetric can be changed. The options are different for each metric, and defined in the `techreport.json`.

#### CSS

We use vanilla CSS, no libraries. Bootstrap is loaded as well because it's used in the shared the header.

## Todos and improvements

This is still a work in progress, todos will be tracked elsewhere.
