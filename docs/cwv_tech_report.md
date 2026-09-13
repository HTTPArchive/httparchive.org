# CWV Tech Report Architecture & Frontend Guide

## 1. Architecture Overview

The HTTP Archive Tech Report is built using **Astro (SSR & client scripting)**, vanilla JavaScript, and **Highcharts**. The initial page skeleton and metadata slots are generated server-side, while data fetching, state synchronization, and visualization rendering happen client-side.

### Core File Structure

- **Configuration**:
  - `config/techreport.json`: Central configuration containing metric definitions, endpoints, page structures, summary cards, and brackets.
- **Astro Pages**:
  - `src/pages/reports/techreport/tech.astro`: Handles Drilldown (1 technology) and Comparison (2+ technologies) views. Mutually exclusive containers (`#drilldown-view` and `#comparison-view`) are pruned client-side based on the selected technologies.
  - `src/pages/reports/techreport/[page_id].astro`: Parameterized page routing (`category`, `drilldown`, `comparison`).
- **Astro UI Components**:
  - `src/components/techreport/Filters.astro`: Primary sidebar filter form and metadata summary list (`<ul class="meta">`).
  - `src/components/techreport/SummaryCard.astro`: Metric callout cards with circular progress indicators.
  - `src/components/techreport/Timeseries.astro`: Timeseries chart containers, submetric selectors, and summary breakdown cards.
  - `src/components/techreport/TableLinked.astro`: Categorized technologies data table with pagination and multi-select comparison.
  - `src/components/techreport/GeoBreakdown.astro`: Geographic breakdown table container.
  - `src/components/techreport/CwvDistribution.astro`: CWV histogram distribution container.
- **Client JavaScript (`src/js/techreport/`)**:
  - `index.js` (`TechReport`): Main orchestrator. Handles filter bindings, client switcher, accessibility, and creates `Section` instances.
  - `section.js` (`Section`): Manages one metric section (e.g. Adoption, CWVs, Lighthouse) and its child components.
  - `summaryCards.js` (`SummaryCard`): Formats latest values, updates circular SVG progress indicators, and applies score brackets.
  - `timeseries.js` (`Timeseries`): Manages Highcharts timeseries generation, breakdown list cards, and tabular view toggling.
  - `tableLinked.js` (`TableLinked`): Manages category table sorting, pagination, and multi-technology comparison checkboxes.
  - `geoBreakdown.js` (`GeoBreakdown`): Renders geographic distribution table.
  - `cwvDistribution.js` (`CwvDistribution`): Highcharts histogram chart with dynamic bucket trimming.
- **Shared UI Helpers (`src/js/components/`)**:
  - `filters.js` (`Filters`): Handles `#page-filters` form submission and combobox interactions.
  - `drilldownHeader.js` (`DrilldownHeader`): Updates header titles, icons, and `[data-slot]` metadata badges across the DOM.

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

### URL Parameter Preservation

State must be preserved when navigating between views or submitting filters:
- **Sidebar Form (`filters.js:setFilter`)**: Reads active client from dropdown or URL to ensure submitting Geo/Rank/Tech does not reset `client`.
- **Category Table Links (`tableLinked.js`)**: Append `${client ? '&client=' + client : ''}` to technology drilldown links.
- **Compare Action Links (`data.js` & `tableLinked.js:updateSelectionText`)**: Append active `&client=...`, `&geo=...`, and `&rank=...` when building the comparison target URL.

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
   - In Drilldown view (`breakdown === 'client'`), the timeseries plots both Mobile and Desktop, and the breakdown list renders dual cards (one for Mobile, one for Desktop).
   - In Comparison view (`breakdown === 'app'`), the breakdown list renders individual technology cards for the currently selected client (`component.dataset.client`).
3. **`Metadata Slots`**:
   - Use `DrilldownHeader.updateFilterMeta(filters)` as the central method for updating `[data-slot="client"]`, `[data-slot="geo"]`, `[data-slot="rank"]`, and `[data-slot="tech"]`. Capitalize client labels ("Mobile" / "Desktop") using `UIUtils.capitalizeFirstLetter()`.
