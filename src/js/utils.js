export const el = tagName => document.createElement(tagName);

export const prettyDate = YYYY_MM_DD => {
  const [YYYY, MM, DD] = YYYY_MM_DD.split('_');
  const d = new Date(Date.UTC(YYYY, MM - 1, DD));
  return getFullDate(d);
};

export const getFullDate = d => {
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
}

export const chartExportOptions = {
  menuItemDefinitions: {
    showQuery: {
      onclick: function() {
        const {metric, type} = this.options;
        const url = getQueryUrl(metric, type);
        if (!url) {
          console.warn(`Unable to get query URL for metric "${metric}" and chart type "${type}".`)
          return;
        }
        window.open(url, '_blank');
      },
      text: 'Show Query'
    }
  },
  buttons: {
    contextButton: {
      menuItems: ['showQuery', 'downloadPNG']
    }
  }
};

// Summarizes a metric by highlighting its primary value, usually the median.
// This function may be called multiple times after page load, for example if the
// visualization range changes the summary value will be updated.
export const drawMetricSummary = (options, client, value, isMedian=true, change=null) => {
  const metric = options.metric;
  const summary = getSummaryElement(metric, client);
  if (!summary) {
    return;
  }
  summary.classList.remove('hidden');

  if (!isMedian) {
    const metric = summary.querySelector('.metric');
    metric && metric.classList.add('hidden');
  }

  summary.querySelector('.primary').innerText = value;

  if (change) {
    const changeEl = summary.querySelector('.change');
    changeEl.innerText = formatChange(change);
    changeEl.classList.remove('good', 'bad', 'neutral'); // Reset the classes.
    changeEl.classList.add(getChangeSentiment(change, options));
  }
};

const getQueryUrl = (metric, type) => {
  const URL_BASE = 'https://github.com/HTTPArchive/bigquery/blob/master/sql';
  if (type === 'timeseries') {
    return `${URL_BASE}/timeseries/${metric}.sql`;
  }
  if (type === 'histogram') {
    return `${URL_BASE}/histograms/${metric}.sql`;
  }
};

const getSummaryElement = (metric, client) => {
  return document.querySelector(`#${metric} .metric-summary.${client}`);
};

const formatChange = change => {
  // Up for non-negative, down for negative.
  return `${change >= 0 ? '\u25B2' : '\u25BC'}${Math.abs(change).toFixed(1)}%`
};

const getChangeSentiment = (change, options) => {
  // If a metric goes down, is that good or bad?
  let sentiments = ['good', 'bad'];
  if (options.downIsBad) {
    sentiments.reverse();
  } else if (options.downIsNeutral) {
    return 'neutral';
  }

  change = +change.toFixed(1);
  if (change < 0) {
    return sentiments[0];
  }
  if (change > 0) {
    return sentiments[1];
  }
  return 'neutral';
};

export const getLatestEntry = (data) => {
  const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted[0];
};

export const getPercentage = (x, y) => {
  if(y && y > 0) {
    return parseInt(parseInt(x) / parseInt(y) * 10000) / 100;
  }

  return;
}
