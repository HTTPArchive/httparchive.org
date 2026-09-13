import { Constants } from "./constants";
import { UrlUtils } from "./url";

const parseVitalsData = (metric, previousMetric, date) => {
  return metric.map(submetric => {
    const previousSubmetric = previousMetric?.find(row => row.name === submetric.name);
    const goodPercDesktop = submetric?.desktop?.tested > 0 ? Math.round(submetric.desktop.good_number / submetric.desktop.tested * 100) : null;
    const goodPercMobile = submetric?.mobile?.tested > 0 ? Math.round(submetric.mobile.good_number / submetric.mobile.tested * 100) : null;
    const goodPercDesktopPrevious = previousSubmetric?.desktop?.tested > 0 ? Math.round(previousSubmetric.desktop.good_number / previousSubmetric.desktop.tested * 100) : null;
    const goodPercMobilePrevious = previousSubmetric?.mobile?.tested > 0 ? Math.round(previousSubmetric.mobile.good_number / previousSubmetric.mobile.tested * 100) : null;

    const monthOverMonthDesktop = calculateMoM(goodPercDesktop || 0, goodPercDesktopPrevious || 0);
    const monthOverMonthMobile = calculateMoM(goodPercMobile || 0, goodPercMobilePrevious || 0);

    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        good_pct: goodPercDesktop,
        client: 'desktop',
        date: date,
        momPerc: monthOverMonthDesktop.perc,
        momString: monthOverMonthDesktop.percString,
      },
      mobile: {
        ...submetric.mobile,
        good_pct: goodPercMobile,
        client: 'mobile',
        date: date,
        momPerc: monthOverMonthMobile.perc,
        momString: monthOverMonthMobile.percString,
      },
    };
  });
}

const parseLighthouseData = (metric, previousMetric, date) => {
  return metric.map(submetric => {
    const previousSubmetric = previousMetric?.find(row => row.name === submetric.name);

    const rawScoreDesktop = submetric?.desktop?.median_score;
    const rawScoreMobile = submetric?.mobile?.median_score;
    const medianScoreDesktop = (rawScoreDesktop !== null && rawScoreDesktop !== undefined && !isNaN(rawScoreDesktop)) ? Number(rawScoreDesktop) : null;
    const medianScoreMobile = (rawScoreMobile !== null && rawScoreMobile !== undefined && !isNaN(rawScoreMobile)) ? Number(rawScoreMobile) : null;
    const medianScoreDesktopPrevious = previousSubmetric?.desktop?.median_score || 0;
    const medianScoreMobilePrevious = previousSubmetric?.mobile?.median_score || 0;

    const monthOverMonthDesktop = calculateMoM(medianScoreDesktop || 0, medianScoreDesktopPrevious || 0, true);
    const monthOverMonthMobile = calculateMoM(medianScoreMobile || 0, medianScoreMobilePrevious || 0, true);

    const desktopPct = medianScoreDesktop !== null ? Math.round(medianScoreDesktop * 100) : null;
    const mobilePct = medianScoreMobile !== null ? Math.round(medianScoreMobile * 100) : null;

    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        median_score_pct: desktopPct,
        client: 'desktop',
        date: date,
        momPerc: monthOverMonthDesktop.perc,
        momString: monthOverMonthDesktop.percString,
      },
      mobile: {
        ...submetric.mobile,
        median_score_pct: mobilePct,
        client: 'mobile',
        date: date,
        momPerc: monthOverMonthMobile.perc,
        momString: monthOverMonthMobile.percString,
      },
    };
  });
}

const parseAdoptionData = (submetric, previousMetric, date) => {
  const monthOverMonthDesktop = calculateMoM(submetric?.desktop, previousMetric?.desktop);
  const monthOverMonthMobile = calculateMoM(submetric?.mobile, previousMetric?.mobile);

  return [
    {
      desktop: {
        origins: submetric.desktop,
        client: 'desktop',
        date: date,
        momPerc: monthOverMonthDesktop.perc,
        momString: monthOverMonthDesktop.percString
      },
      mobile: {
        origins: submetric.mobile,
        client: 'mobile',
        date: date,
        momPerc: monthOverMonthMobile.perc,
        momString: monthOverMonthMobile.percString
      },
      name: 'adoption',
    },
  ];
}

const formatBytes = (value) => {
  return value > 1048576 ? `${Math.round(value / 1048576)} MB` : value > 1024 ? `${Math.round(value / 1024)} KB` : `${value} bytes`;
};

const formatAppName = (app) => {
  return app === 'ALL' ? 'All technologies' : app;
}

const parsePageWeightData = (metric, previousMetric, date) => {
  return metric.map(submetric => {
    const previousSubmetric = previousMetric?.find(row => row.name === submetric.name);
    const monthOverMonthDesktop = calculateMoM(submetric?.desktop?.median_bytes, previousSubmetric?.desktop?.median_bytes);
    const monthOverMonthMobile = calculateMoM(submetric?.mobile?.median_bytes, previousSubmetric?.mobile?.median_bytes);

    return {
      ...submetric,
      desktop: {
        ...submetric?.desktop,
        median_bytes_formatted: formatBytes(submetric?.desktop?.median_bytes),
        client: 'desktop',
        date: date,
        momPerc: monthOverMonthDesktop.perc,
        momString: monthOverMonthDesktop.percString

      },
      mobile: {
        ...submetric?.mobile,
        median_bytes_formatted: formatBytes(submetric?.mobile?.median_bytes),
        client: 'mobile',
        date: date,
        momPerc: monthOverMonthMobile.perc,
        momString: monthOverMonthMobile.percString
      },
    };
  });
}

const filterDuplicates = (array, key) => {
  const filtered = [];
  array.forEach((row) => {
    const matchingKeys = filtered.filter(filteredRow => filteredRow[key] === row[key]);
    if(matchingKeys.length < 1) {
      filtered.push(row);
    }
  });
  return filtered;
};

const getLighthouseScoreCategories = (score, brackets) => {
  return brackets.find(bracket => bracket.min <= score && bracket.max >= score);

}

const fetchMetricsForTechnologies = async ({ technologies, geo = 'ALL', rank = 'ALL', start, end }) => {
  if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
    return {};
  }

  const apis = [
    {
      endpoint: 'technologies',
      metric: 'technologies',
    },
    {
      endpoint: 'cwv',
      metric: 'vitals',
      parse: parseVitalsData,
    },
    {
      endpoint: 'lighthouse',
      metric: 'lighthouse',
      parse: parseLighthouseData,
    },
    {
      endpoint: 'adoption',
      metric: 'adoption',
      parse: parseAdoptionData,
    },
    {
      endpoint: 'page-weight',
      metric: 'pageWeight',
      parse: parsePageWeightData,
    },
  ];

  const technologyParam = technologies.map(encodeURIComponent).join(',');
  const geoParam = encodeURIComponent(geo || 'ALL');
  const rankParam = encodeURIComponent(rank || 'ALL');

  let allResults = {};
  let techInfo = {};
  technologies.forEach(tech => {
    allResults[tech] = [];
  });

  await Promise.all(apis.map(async api => {
    let url = `${Constants.apiBase}/${api.endpoint}?technology=${technologyParam}&geo=${geoParam}&rank=${rankParam}`;
    if (start) {
      url += `&start=${encodeURIComponent(start)}`;
    }
    if (end) {
      url += `&end=${encodeURIComponent(end)}`;
    }

    try {
      const response = await fetch(url);
      const result = await response.json();
      const sortedResult = Array.isArray(result) ? result.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
      let previousRow = {};

      sortedResult.forEach(row => {
        const parsedRow = { ...row };

        if (api.parse) {
          const metric = parsedRow[api.metric] || parsedRow;
          const previousMetric = previousRow[row.technology]?.[api.metric];
          parsedRow[api.metric] = api.parse(metric, previousMetric, parsedRow?.date);
        }

        if (api.endpoint === 'technologies') {
          techInfo[row.technology] = row;
        } else {
          if (!allResults[row.technology]) {
            allResults[row.technology] = [];
          }
          const resIndex = allResults[row.technology].findIndex(res => res.date === row.date);
          if (resIndex > -1) {
            allResults[row.technology][resIndex] = {
              ...allResults[row.technology][resIndex],
              ...techInfo[row.technology],
              ...parsedRow,
            };
          } else {
            allResults[row.technology].push(parsedRow);
          }
        }

        previousRow[row.technology] = row;
      });
    } catch (error) {
      console.log(`Failed to fetch ${api.endpoint}:`, error);
    }
  }));

  // Ensure techInfo properties (such as icon) are merged into allResults even if technologies finishes later
  Object.keys(techInfo).forEach(tech => {
    if (allResults[tech]?.length) {
      allResults[tech].forEach(row => {
        Object.assign(row, techInfo[tech]);
      });
    }
  });

  return allResults;
};

const fetchCategoryData = async (rows, filters, callback) => {
  const geoFormatted = encodeURI(filters.geo);
  const rankFormatted = encodeURI(filters.rank);
  const categoryFormatted = encodeURI(filters.category);
  const url = `${Constants.apiBase}/categories?category=${categoryFormatted}&geo=${geoFormatted}&rank=${rankFormatted}`;

  const pageNr = filters.page;
  try {
    const res = await fetch(url);
    const result = await res.json();
    const category = result[0];
    const firstTechNr = (pageNr - 1) * rows;
    const lastTechNr = pageNr * rows;
    const paginatedTechs = category?.technologies?.slice(firstTechNr, lastTechNr) || [];

    const techsFromUrl = getTechsFromURL();
    const technologyFormatted = paginatedTechs.join(',');
    const rawTechs = techsFromUrl || technologyFormatted || '';
    const safeTechs = rawTechs
      .split(',')
      .map(tech => encodeURIComponent(tech.trim()))
      .filter(Boolean)
      .join(',');

    const compare = document.querySelector('[data-name="selected-apps"]');
    if (compare) {
      const clientQuery = UrlUtils.get('client');
      const validClient = (filters?.client === 'desktop' || clientQuery === 'desktop') ? 'desktop' : 'mobile';
      const geoParam = filters?.geo && filters.geo !== 'ALL' ? `&geo=${encodeURIComponent(filters.geo)}` : '';
      const rankParam = filters?.rank && filters.rank !== 'ALL' ? `&rank=${encodeURIComponent(filters.rank)}` : '';
      compare.setAttribute('href', `/reports/techreport/tech?tech=${safeTechs}${geoParam}${rankParam}&client=${validClient}`);
    }

    const allResults = await fetchMetricsForTechnologies({
      technologies: paginatedTechs,
      geo: filters.geo,
      rank: filters.rank,
      start: 'latest',
    });

    category.data = {
      technologies: allResults,
      info: {
        origins: category.origins,
        technologies: category?.technologies?.length,
      },
    };

    /* Update the pagination info */
    const current = document.querySelectorAll('[data-page="current"]');
    const total = document.querySelectorAll('[data-page="total"]');
    const totalPages = Math.ceil((category?.technologies?.length || 0) / rows);
    current.forEach(c => c.textContent = pageNr);
    total.forEach(t => t.textContent = totalPages);

    /* Update pagination links visibility */
    const nextPageLink = document.querySelector('[data-pagination="next"]');
    const prevPageLink = document.querySelector('[data-pagination="previous"]');

    const buildPaginationUrl = (page) => {
      const pUrl = new URL(window.location.href);
      pUrl.searchParams.set('page', page);
      return pUrl.pathname + pUrl.search;
    };

    if (prevPageLink) {
      if (pageNr <= 1) {
        prevPageLink.style.display = 'none';
        prevPageLink.textContent = '';
      } else {
        prevPageLink.style.display = 'block';
        prevPageLink.textContent = '';
        const prevAnchor = document.createElement('a');
        prevAnchor.href = buildPaginationUrl(pageNr - 1);
        prevAnchor.textContent = 'Previous page';
        prevPageLink.appendChild(prevAnchor);
      }
    }
    if (nextPageLink) {
      if (pageNr >= totalPages) {
        nextPageLink.style.display = 'none';
        nextPageLink.textContent = '';
      } else {
        nextPageLink.style.display = 'block';
        nextPageLink.textContent = '';
        const nextAnchor = document.createElement('a');
        nextAnchor.href = buildPaginationUrl(pageNr + 1);
        nextAnchor.textContent = 'Next page';
        nextPageLink.appendChild(nextAnchor);
      }
    }

    /* Update components */
    callback(category);
  } catch (error) {
    console.log('Error fetching category data:', error);
  }
};

const getTechsFromURL = () => {
  return UrlUtils.get('selected');
}

function calculateMoM(current, previous, roundDown) {
  const previousAdjusted = roundDown === true ? (Math.floor(previous * 100) / 100) : previous;
  const currentAdjusted = roundDown === true ? (Math.floor(current * 100) / 100) : current;
  if(currentAdjusted && previousAdjusted && previousAdjusted !== 0) {
    const absoluteDiff = currentAdjusted - previousAdjusted;
    const percDiff = (currentAdjusted - previousAdjusted) / previousAdjusted;
    return {
      absolute: absoluteDiff,
      perc: percDiff,
      percString: `${(percDiff * 100).toFixed(2)}%`
    };
  }

  return {
    absolute: null,
    perc: null,
    percString: '-'
  }
}

export const DataUtils = {
  parseVitalsData,
  parseLighthouseData,
  parseAdoptionData,
  parsePageWeightData,
  filterDuplicates,
  getLighthouseScoreCategories,
  formatAppName,
  fetchCategoryData,
  fetchMetricsForTechnologies,
  getTechsFromURL,
};
