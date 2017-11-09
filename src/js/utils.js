export const el = tagName => document.createElement(tagName);

export const prettyDate = YYYY_MM_DD => {
	const [YYYY, MM, DD] = YYYY_MM_DD.split('_');
	const d = new Date(Date.UTC(YYYY, MM - 1, DD));
	return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
};

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

const getQueryUrl = (metric, type) => {
	const URL_BASE = 'https://raw.githubusercontent.com/HTTPArchive/beta.httparchive.org/master/sql';
	if (type === 'timeseries') {
		return `${URL_BASE}/timeseries/${metric}.sql`;
	}
	if (type === 'histogram') {
		return `${URL_BASE}/histograms/${metric}.sql`;
	}
};
