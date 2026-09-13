/**
 * URL Utilities for Tech Report
 * Centralized query parameter parsing, serialization, and state helpers.
 */
function safeDecode(val) {
  if (typeof val !== 'string') return val;
  try {
    let decoded = decodeURIComponent(val);
    if (decoded.includes('%')) {
      try { decoded = decodeURIComponent(decoded); } catch (_) {}
    }
    return decoded;
  } catch (_) {
    return val;
  }
}

export const UrlUtils = {
  /**
   * Returns current URLSearchParams instance.
   */
  getParams() {
    return new URLSearchParams(window.location.search);
  },

  /**
   * Get a single query parameter value, or defaultValue if not set.
   */
  get(param, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;
    const val = new URLSearchParams(window.location.search).get(param);
    return val !== null ? safeDecode(val) : defaultValue;
  },

  /**
   * Update or remove a query parameter without reloading the page.
   */
  setParam(key, value, replace = true) {
    const url = new URL(window.location.href);
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    return url;
  },

  /**
   * Parse standardized Tech Report filters from the current URL.
   */
  getFilters(pageConfig = null) {
    const params = new URLSearchParams(window.location.search);
    const requestedGeo = safeDecode(params.get('geo')) || 'ALL';
    const requestedRank = safeDecode(params.get('rank')) || 'ALL';
    const requestedClient = safeDecode(params.get('client')) || 'mobile';
    const requestedCategory = safeDecode(params.get('category')) || 'CMS';
    const requestedStart = safeDecode(params.get('start')) || '';
    const requestedEnd = safeDecode(params.get('end')) || '';
    const requestedPage = parseInt(params.get('page') || '1', 10);
    const selectedTechs = params.get('selected');
    const selectedRows = params.get('rows') || '10';
    const lastPage = params.get('last_page') === 'true';

    let requestedTechs = ['ALL'];
    const techParam = params.get('tech');
    if (techParam) {
      requestedTechs = techParam.split(',').map(t => safeDecode(t.trim())).filter(Boolean);
    } else if (pageConfig?.config?.default?.app) {
      requestedTechs = pageConfig.config.default.app;
    }

    return {
      geo: requestedGeo,
      rank: requestedRank,
      client: requestedClient,
      app: requestedTechs,
      category: requestedCategory,
      page: requestedPage,
      last_page: lastPage,
      selected: selectedTechs,
      rows: selectedRows,
      start: requestedStart,
      end: requestedEnd,
    };
  }
};

if (typeof window !== 'undefined') {
  window.UrlUtils = UrlUtils;
}
