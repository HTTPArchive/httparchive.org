import { Constants } from "./constants";

const parseVitalsData = (metric, date) => {
  return metric.map(submetric => {
    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        good_pct: submetric?.desktop?.tested > 0 ? parseInt(submetric.desktop.good_number / submetric.desktop.tested * 100) : 0,
        client: 'desktop',
        date: date,
      },
      mobile: {
        ...submetric.mobile,
        good_pct: submetric?.mobile?.tested > 0 ? parseInt(submetric.mobile.good_number / submetric.mobile.tested * 100) : 0,
        client: 'mobile',
        date: date,
      },
    };
  });
}

const parseLighthouseData = (metric, date) => {
  return metric.map(submetric => {
    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        median_score_pct: parseInt(submetric?.desktop?.median_score * 100),
        client: 'desktop',
        date: date,
      },
      mobile: {
        ...submetric.mobile,
        median_score_pct: parseInt(submetric?.mobile?.median_score * 100),
        client: 'mobile',
        date: date,
      },
    };
  });
}

const parseAdoptionData = (submetric, date) => {
  return [
    {
      desktop: {
        origins: submetric.desktop,
        client: 'desktop',
        date: date,
      },
      mobile: {
        origins: submetric.mobile,
        client: 'mobile',
        date: date,
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

const parsePageWeightData = (metric, date) => {
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
  const url = `${Constants.apiBase}/categories?category=${filters.category}`;
  const apis = [
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

      const technologyFormatted = paginatedTechs?.join('%2C')
        .replaceAll(" ", "%20");

      const compare = document.querySelector('[data-name="selected-apps"]');
      compare.setAttribute('href', `/reports/techreport/tech?tech=${technologyFormatted}`);

      const geo = filters.geo.replaceAll(" ", "%20");
      const rank = filters.rank.replaceAll(" ", "%20");
      const geoFormatted = geo.replaceAll(" ", "%20");
      const rankFormatted = rank.replaceAll(" ", "%20");

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
        current.forEach(c => c.innerHTML = pageNr);
        total.forEach(t => t.innerHTML = Math.ceil(category?.technologies?.length / rows));

        /* Update components */
        callback(category);
      });
    });
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
};
