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
        client: 'desktop',
        date: date,
      },
      mobile: {
        ...submetric.mobile,
        client: 'mobile',
        date: date,
      },
    };
  });
}

export const DataUtils = {
  parseVitalsData,
  parseLighthouseData,
  parseAdoptionData,
  parsePageWeightData,
};
