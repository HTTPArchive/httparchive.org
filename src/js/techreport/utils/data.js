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

const parsePageWeightData = (metric, date) => {
  return metric.map(submetric => {
    return {
      ...submetric,
      desktop: {
        ...submetric.desktop,
        median_bytes_formatted: submetric.desktop.median_bytes > 1048576 ? `${Math.round(submetric.desktop.median_bytes / 1048576)} MB` : submetric.desktop.median_bytes > 1024 ? `${Math.round(submetric.desktop.median_bytes / 1024)} KB` : `${submetric.desktop.median_bytes} bytes`,
        client: 'desktop',
        date: date,
      },
      mobile: {
        ...submetric.mobile,
        median_bytes_formatted: submetric.mobile.median_bytes > 1024 ? `${Math.round(submetric.mobile.median_bytes / 1024)} KB` : submetric.mobile.median_bytes > 1048576 ? `${Math.round(submetric.mobile.median_bytes / 1048576)} MB` : `${submetric.mobile.median_bytes} bytes`,
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

export const DataUtils = {
  parseVitalsData,
  parseLighthouseData,
  parseAdoptionData,
  parsePageWeightData,
  filterDuplicates,
  getLighthouseScoreCategories,
};
