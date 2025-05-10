import { Constants } from "./constants";

const parseVitalsData = (metric, previousMetric, date) => {
  return metric.map(submetric => {
    const previousSubmetric = previousMetric?.find(row => row.name === submetric.name);
    const goodPercDesktop = submetric?.desktop?.tested > 0 ? parseInt(submetric.desktop.good_number / submetric.desktop.tested * 100) : 0;
    const goodPercMobile = submetric?.mobile?.tested > 0 ? parseInt(submetric.mobile.good_number / submetric.mobile.tested * 100) : 0;
    const goodPercDesktopPrevious = previousSubmetric?.desktop?.tested > 0 ? parseInt(previousSubmetric.desktop.good_number / previousSubmetric.desktop.tested * 100) : 0;
    const goodPercMobilePrevious = previousSubmetric?.mobile?.tested > 0 ? parseInt(previousSubmetric.mobile.good_number / previousSubmetric.mobile.tested * 100) : 0;

    const monthOverMonthDesktop = calculateMoM(goodPercDesktop, goodPercDesktopPrevious);
    const monthOverMonthMobile = calculateMoM(goodPercMobile, goodPercMobilePrevious);

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

    const medianScoreDesktop = submetric?.desktop?.median_score || 0;
    const medianScoreMobile = submetric?.mobile?.median_score || 0;
    const medianScoreDesktopPrevious = previousSubmetric?.desktop?.median_score || 0;
    const medianScoreMobilePrevious = previousSubmetric?.mobile?.median_score || 0;

    const monthOverMonthDesktop = calculateMoM(medianScoreDesktop, medianScoreDesktopPrevious);
    const monthOverMonthMobile = calculateMoM(medianScoreMobile, medianScoreMobilePrevious);

    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        median_score_pct: parseInt(submetric?.desktop?.median_score * 100),
        client: 'desktop',
        date: date,
        momPerc: monthOverMonthDesktop.perc,
        momString: monthOverMonthDesktop.percString,
      },
      mobile: {
        ...submetric.mobile,
        median_score_pct: parseInt(submetric?.mobile?.median_score * 100),
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
    return {
      ...submetric,
      desktop: {
        ...submetric?.desktop,
        median_bytes_formatted: formatBytes(submetric?.desktop?.median_bytes),
        client: 'desktop',
        date: date,
      },
      mobile: {
        ...submetric?.mobile,
        median_bytes_formatted: formatBytes(submetric?.mobile?.median_bytes),
        client: 'mobile',
        date: date,
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

const fetchCategoryData = (rows, filters, callback) => {
  const geoFormatted = encodeURI(filters.geo);
  const rankFormatted = encodeURI(filters.rank);
  const categoryFormatted = encodeURI(filters.category);
  const url = `${Constants.apiBase}/categories?category=${categoryFormatted}&geo=${geoFormatted}&rank=${rankFormatted}`;
  const apis = [
    {
      endpoint: 'technologies',
      metric: 'technologies',
    },
    {
      endpoint: 'cwv',
      metric: 'vitals',
      parse: DataUtils.parseVitalsData,
    },
    {
      endpoint: 'lighthouse',
      metric: 'lighthouse',
      parse: DataUtils.parseLighthouseData,
    },
    {
      endpoint: 'adoption',
      metric: 'adoption',
      parse: DataUtils.parseAdoptionData,
    },
    {
      endpoint: 'page-weight',
      metric: 'pageWeight',
      parse: DataUtils.parsePageWeightData,
    },
  ];

  const pageNr = filters.page;
  fetch(url)
    .then(result => result.json())
    .then(result => {
      const category = result[0];
      const firstTechNr = (pageNr - 1) * rows;
      const lastTechNr = pageNr * rows;
      const paginatedTechs = category?.technologies?.slice(firstTechNr, lastTechNr);

      const techsFromUrl = getTechsFromURL();
      const technologyFormatted = paginatedTechs?.join(',');
      const technologyUrl = encodeURI(techsFromUrl || technologyFormatted);

      const compare = document.querySelector('[data-name="selected-apps"]');
      compare.setAttribute('href', `/reports/techreport/tech?tech=${technologyUrl}`);

      let allResults = {};
      paginatedTechs.forEach(tech => allResults[tech] = []);

      Promise.all(apis.map(api => {
        const url = `${Constants.apiBase}/${api.endpoint}?technology=${technologyFormatted}&geo=${geoFormatted}&rank=${rankFormatted}&start=latest`;

        return fetch(url)
          .then(techResult => techResult.json())
          .then(techResult => {
            techResult.forEach(row => {
              const parsedRow = {
                ...row,
              }

              if(api.parse) {
                parsedRow[api.metric] = api.parse(parsedRow[api.metric], parsedRow?.date);
              }

              const resIndex = allResults[row.technology].findIndex(res => res.date === row.date);
              if(resIndex > -1) {
                allResults[row.technology][resIndex] = {
                  ...allResults[row.technology][resIndex],
                  ...parsedRow
                }
              } else if(allResults[row.technology].length === 1) {
                allResults[row.technology][0] = {
                  ...allResults[row.technology][0],
                  ...parsedRow
                }
              } else {
                allResults[row.technology].push(parsedRow);
              }
            });
          });
      })).then(() => {
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
        current.forEach(c => c.textContent = pageNr);
        total.forEach(t => t.textContent = Math.ceil(category?.technologies?.length / rows));

        /* Update components */
        callback(category);
      });
    });
}

const getTechsFromURL = () => {
  const url = new URL(window.location);
  return url.searchParams.get('selected') || null;
}

function calculateMoM(current, previous) {
  if(current && previous && previous !== 0) {
    const absoluteDiff = current - previous;
    const percDiff = (current - previous) / previous;
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
  getTechsFromURL,
};
