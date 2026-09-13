# CWV Tech Report Architecture & Frontend Guide

## 1. Architecture Overview

The HTTP Archive Tech Report is built using **Astro (SSR & client scripting)**, vanilla JavaScript, and **Highcharts**. The initial page skeleton and metadata slots are generated server-side, while data fetching, state synchronization, and visualization rendering happen client-side.

### Core File Structure

- **Configuration**:
  - `config/techreport.json`: Central configuration containing metric definitions, endpoints, page structures, summary cards, and brackets.
- **Astro Pages**:
  - `src/pages/reports/techreport/landing.astro`: Report landing page linking to featured categories, technologies, and comparison entry points.
  - `src/pages/reports/techreport/tech.astro`: Polymorphic route matching `/reports/techreport/tech`. Renders skeletons for both **Drilldown** (1 technology) and **Comparison** (2+ technologies) layouts, dynamically pruning the inactive container on load based on `?tech=`.
  - `src/pages/reports/techreport/[page_id].astro`: Parameterized SSG page routing for static endpoints (`category`, `drilldown`, and `comparison`).
- **Astro UI Components (`src/components/techreport/`)**:
  - `Filters.astro`: Primary sidebar filter form and metadata summary list (`<ul class="meta">`).
  - `CategoryFilters.astro`: Filter bar for category browsing with search and pagination controls.
  - `SummaryCard.astro`: Metric callout cards with circular progress indicators.
  - `Timeseries.astro`: Timeseries chart containers, submetric selectors, and summary breakdown cards.
  - `TableLinked.astro`: Categorized technologies data table with pagination, sorting, and comparison checkboxes.
  - `GeoBreakdown.astro`: Geographic breakdown table container.
  - `CwvDistribution.astro`: CWV histogram distribution container.
- **Client JavaScript (`src/js/techreport/`)**:
  - `index.js` (`TechReport`): Main orchestrator. Manages initialization, subcategory listeners, client switcher, data fetching, and creates `Section` instances.
  - `section.js` (`Section`): Manages one metric section (e.g. Adoption, CWVs, Lighthouse, Page Weight) and its child components.
  - `summaryCards.js` (`SummaryCard`): Formats latest values, updates circular SVG progress indicators, and applies score brackets.
  - `timeseries.js` (`Timeseries`): Manages Highcharts timeseries generation, breakdown list cards, and tabular view toggling.
  - `tableLinked.js` (`TableLinked`): Manages category table sorting, pagination, multi-tech comparison checkboxes, and comparison summary tables.
  - `table.js` (`Table`): Utility for generic table data rendering and column sorting.
  - `geoBreakdown.js` (`GeoBreakdown`): Renders geographic distribution table. Listens to CWV submetric updates.
  - `cwvDistribution.js` (`CwvDistribution`): Highcharts histogram chart with dynamic bucket trimming. Listens to CWV submetric updates.
  - `combobox.js`: Accessible combobox for searching and selecting technologies and categories.
- **Shared UI Helpers (`src/js/components/`)**:
  - `filters.js` (`Filters`): Handles `#page-filters` form submission and combobox interactions.
  - `drilldownHeader.js` (`DrilldownHeader`): Central helper updating header titles, icons, and `[data-slot]` metadata badges across the DOM.
- **Utilities (`src/js/techreport/utils/`)**:
  - `constants.js`: API base URLs and global constants.
  - `data.js` (`DataUtils`): Metric parsing, Month-over-Month calculations, category data fetching, and query parameter helpers.
  - `ui.js` (`UIUtils`): Date formatting, string capitalization, and component DOM updates.

---

## 2. Filters & State Management

### Client Filter (`mobile` vs `desktop`)

- **Default Value**: `'mobile'`.
- **Dropdown Elements**:
  - Drilldown / Category: `select#client-breakdown[name="client-breakdown"]`.
  - Comparison: `select#comparison-client-breakdown[name="client-breakdown"]`.
  - *Best Practice*: Always query using `document.querySelectorAll('select[name="client-breakdown"], #client-breakdown, #comparison-client-breakdown')`.
- **Initialization Lifecycle**:
  - In `TechReport.initializeReport()`, `this.bindClientListener()` **must execute before** constructing `Section` instances.
  - Restores the client from URL (`?client=...`) or defaults to `'mobile'`, synchronizes dropdown `.value`, sets `this.filters.client`, and updates `dataset.client` on all matching DOM elements (`.card`, `.report-section`, `table`).
- **Reactive Re-rendering**:
  - When the client dropdown changes:
    1. Update `this.filters.client = client`.
    2. Sync URL via `history.replaceState(null, null, url)`.
    3. Update all client select elements on the page.
    4. Set `dataset.client = client` on all section/card elements.
    5. Propagate `section.pageFilters.client = client` and call `section.updateSection()`.
    6. Call `DrilldownHeader.updateFilterMeta(this.filters)` so all `[data-slot="client"]` badges update to "Mobile" or "Desktop".

### Subsection / Subcategory Selectors (e.g. `good-cwv-over-time`)

- **Elements**: `<select name="subcategory" class="subcategory-selector" data-controls="..." data-param="..." data-endpoint="...">`.
- **Query Parameters**:
  - CWV Metrics: `?good-cwv-over-time=overall|LCP|INP|CLS|FCP|TTFB`
  - Lighthouse: `?median-lighthouse-over-time=performance|accessibility|best_practices|seo`
  - Page Weight: `?weight-over-time=total|js|images`
- **Restoration on Reload**:
  - Astro generates static HTML where the default option has `selected=""`.
  - On page load / reload, `TechReport.bindSubcategoryListener()` and `Timeseries.syncSubcategory()` inspect the URL parameter matching `data-param` (or `pageConfig[id].subcategory.param`).
  - If a parameter value exists in the URL, the dropdown `.value` is restored, `this.submetric` is set, `component.dataset.category` is updated, and `this.updateInfo(metric, endpoint)` updates the section title (`<h3>`) and description (`.descr`).
- **Reactive Updates (`Timeseries.updateSubmetric`)**:
  - Updates the URL via `window.history.replaceState`.
  - Sets `this.submetric = value` and `component.dataset.category = value`.
  - Synchronizes any sibling matching selectors for the section.
  - Re-renders `Timeseries.updateContent()` and `Timeseries.updateInfo()`.
  - Dispatches `cwv-metric-change` custom event for connected components (`CwvDistribution` and `GeoBreakdown`).

### Cross-Component Event Bus (`cwv-metric-change`)

- Dispatched on `window` whenever the active CWV submetric changes in `Timeseries`:
  ```javascript
  window.dispatchEvent(new CustomEvent('cwv-metric-change', { detail: { metric: value } }));
  ```
- `CwvDistribution` listens to this event to fetch histogram data for the new metric and re-render the distribution chart.
- `GeoBreakdown` listens to this event to update its submetric data table and ranking.

### URL Parameter Preservation & Safe Sanitization

State must be preserved when navigating between views or submitting filters:
- **Sidebar Form (`filters.js:setFilter`)**: Reads active client from dropdown or URL to ensure submitting Geo/Rank/Tech does not reset `client`.
- **Category Table Links (`tableLinked.js`)**: Appends `${client ? '&client=' + client : ''}` to technology drilldown links.
- **Compare Action Links (`data.js` & `tableLinked.js:updateSelectionText`)**:
  - All dynamic query parameters (`tech`, `geo`, `rank`, `start`, `end`) **must** be sanitized with `encodeURIComponent`.
  - The `client` parameter is strictly validated against `'desktop'` or `'mobile'` to eliminate tainted input flow and satisfy CodeQL security checks.

---

## 3. Responsive & Mobile Viewport Behavior

- **Desktop ($\gt$ 50rem / 800px)**:
  - Sidebar (`.filters`) is docked to the left.
  - Client dropdown sits aligned to the right inside `.intro .heading-wrapper .breakdown`.
- **Mobile Viewport ($\le$ 50rem / 800px)**:
  - Sidebar collapses; `.mobile-filters` bar appears at the top.
  - Tapping `#open-filters-mobile` expands `#mobile-filter-container`, moving `#report-filters` into view.
  - **Client Dropdown Position**: Remains in `.intro .heading-wrapper .breakdown` right below the main title. On screens under 40rem (640px), `.heading-wrapper` displays as a block (`display: block`) for clean vertical stacking.
- **Mobile Viewport vs Mobile Dataset**:
  - *Mobile Viewport*: Responsive layout adjustments for small screens.
  - *Mobile Dataset* (`client=mobile`): HTTP Archive mobile crawl dataset. Both mobile and desktop datasets share identical reactivity and layout rules.

---

## 4. Component Implementation Rules

1. **`SummaryCard`**:
  - Guard against missing data: `const dataApp = this.data?.[app] || [];`.
  - Explicitly handle zero values: `latestValue !== undefined && latestValue !== null`.
  - Remove stale bracket classes (`circle.classList.remove('good', 'needs-improvement', 'poor')`) on re-renders.
  - Clear change indicator text and classes when no month-over-month data exists.

2. **`Timeseries`**:
  - **Drilldown View (`breakdown === 'client'`)**:
    - The timeseries plots both Mobile and Desktop series.
    - The breakdown list renders dual cards (one for Mobile, one for Desktop).
    - Renders `<li class="tech-meta-item">Technology: <span data-slot="tech">...</span></li>` in `.meta`.
  - **Comparison View (`breakdown === 'app'`)**:
    - The timeseries plots each compared technology as a series.
    - The breakdown list renders individual technology cards for the currently selected client (`component.dataset.client`).
    - The `.tech-meta-item` list element is omitted in `.meta` to prevent redundancy with the breakdown cards directly below.

3. **`TableLinked` & Comparison Summary**:
  - **Category View**:
    - Manages pagination (`page`, `rows`), client-side sorting across columns, and up to 10 multi-technology checkboxes.
    - Updates `?selected=...` in the URL and synchronizes compare button hrefs.
  - **Comparison Summary Table (`#comparison-summary`)**:
    - Prefilled comparison overview table listing all selected technologies.
    - Renders description paragraph:
      `<p>Showing the latest data for <strong data-slot="techs-count">X technologies</strong>.</p>`.
    - Renders summary meta list (`<ul class="meta">`) containing `Client: <span data-slot="client">...</span>`, `Geo: <span data-slot="geo">...</span>`, and `Rank: <span data-slot="rank">...</span>`.

4. **`Metadata Slots` & `DrilldownHeader`**:
  - Use `DrilldownHeader.updateFilterMeta(filters)` as the central method for updating `[data-slot="client"]`, `[data-slot="geo"]`, `[data-slot="rank"]`, `[data-slot="tech"]`, and `[data-slot="techs-count"]`.
  - Capitalize client labels ("Mobile" / "Desktop") using `UIUtils.capitalizeFirstLetter()`.
  - In comparison views, synchronize `h1 span.main-title` and `DrilldownHeader.setTitle()` to `Compare X technologies`.

5. **`Technology Icon Handling`**:
  - `DrilldownHeader.setIcon(icon)` safely normalizes icon paths with `encodeURI(decodeURI(icon))` and wraps CSS background urls in quotes (`url('${imgUrl}')`). This ensures technologies with spaces or special characters in their names (e.g. "Open Graph", "Google Analytics") render correctly in `h1 .title-img`.
  - In `getAllMetricData()`, merge `techInfo` (which contains `icon` and `description`) into `allResults` upon `Promise.all` resolution to ensure drilldown components receive the icon even if the `/technologies` endpoint finishes after metric endpoints.

6. **`CwvDistribution` (Histogram)**:
  - Histogram chart comparing distribution bucket percentages for the selected technology and client.
  - Filters out trailing empty buckets to focus the visualization on populated ranges.
  - Listens to `cwv-metric-change` to refresh when the active vitals metric switches.

7. **`GeoBreakdown`**:
  - Displays geographic distribution table broken down by countries/regions.
  - Updates when either the geo filter, client selector, or CWV submetric changes.

8. **`Empty Template Placeholders & Immediate Hydration`**:
  - Static templates (`.astro`) leave `<span class="main-title"></span>` and metadata slots (`<span data-slot="..."></span>`) empty rather than hardcoding fallback values like `"ALL"` or `"Mobile"`. This prevents Flash of Incorrect Content (FOIC) when visiting filtered URLs.
  - In `DOMContentLoaded` and `TechReport.prototype.initializeReport()`, `DrilldownHeader.update()` / `DrilldownHeader.updateFilterMeta()` are called synchronously upon page initialization to immediately populate the title and all metadata slots from URL parameters, prior to awaiting asynchronous metric API fetches.

9. **`Unified Client-Side Bootstrap (TechReport.start / TechReport.boot)`**:
  - Instead of duplicate inline script tags in `.astro` files, all techreport pages (`tech.astro`, `[page_id].astro`, and `landing.astro`) use a single call: `TechReport.start()`.
  - `TechReport.boot()` parses URL query parameters, resolves polymorphic pages (`tech.astro` drilldown vs comparison), removes inactive layouts, sets initial titles, fetches crawl dates to populate date selectors, and initializes `TechReport`.

10. **`Reusable View Layout Components`**:
  - `DrilldownView.astro` ([`src/components/techreport/DrilldownView.astro`](file:///Users/maxostapenko/httparchive/httparchive.org/src/components/techreport/DrilldownView.astro)): Encapsulates the single-technology drilldown layout (Summary cards, CWV with geo/histogram panels, Lighthouse, Page Weight, Adoption).
  - `ComparisonView.astro` ([`src/components/techreport/ComparisonView.astro`](file:///Users/maxostapenko/httparchive/httparchive.org/src/components/techreport/ComparisonView.astro)): Encapsulates the multi-technology comparison layout (Summary table, CWV, Lighthouse, Page Weight, Adoption timeseries).
  - `CategoryView.astro` ([`src/components/techreport/CategoryView.astro`](file:///Users/maxostapenko/httparchive/httparchive.org/src/components/techreport/CategoryView.astro)): Encapsulates the category reporting view (Category summary and paginated technology table).
  - Both `[page_id].astro` and `tech.astro` render these shared views, eliminating ~600 lines of duplicate Astro template code.



