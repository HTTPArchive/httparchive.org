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
			const wptConfig = metric[CONFIG_KEY];
			if (!wptConfig) {
				return o;
			}

			try {
				o[metric.id] = this.extractMetric(wptConfig);
			} catch (e) {
				console.error(e);
			}
			return o;
		}, {});
	}

	extractMetric({path, scale}) {
		const properties = path.split(METRICS_DELIM);
		let value = properties.reduce((results, property) => {
			if (!(property in results)) {
				throw `Unable to parse ${path} in WebPageTest results`;
			}

			return results[property];
		}, this.results);
		if (scale) {
			value = +value * scale;
		}
		return value;
	}

}
