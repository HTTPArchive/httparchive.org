const CONFIG_KEY = 'wpt';
const METRICS_DELIM = '$';

export default class WPT {

	constructor(id) {
		this.id = id;
	}

	fetchResults() {
		const url = `https://www.webpagetest.org/result/${this.id}/?f=json`;
		return fetch(url).then(r => r.text()).then(r => {
			const results = JSON.parse(r);

			if (results.statusCode !== 200) {
				return Promise.reject(results.statusText);
			}

			this.results = results.data;

			return this.results;
		});
	}

	getMetrics(report) {
		return report.metrics.reduce((o, metric) => {
			const wptPath = metric[CONFIG_KEY];
			if (!wptPath) {
				return o;
			}

			o[metric.id] = this.extractMetric(wptPath);
			return o;
		}, {});
	}

	extractMetric(wptPath) {
		const properties = wptPath.split(METRICS_DELIM);
		return properties.reduce((results, property) => {
			return results[property];
		}, this.results);
	}

}
