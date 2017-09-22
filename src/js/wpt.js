const Metrics = {
	'bytesTotal': 'median$firstView$bytesIn',
	'reqsTotal': 'median$firstView$requests$length',
	'tcp': 'median$firstView$connections'
};
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

	getMetrics() {
		if (!this.results) {
			return;
		}

		return Object.keys(Metrics).reduce((o, metric) => {
			o[metric] = this.extractMetric(metric);
			return o;
		}, {});
	}

	extractMetric(metric) {
		const path = Metrics[metric];
		const properties = path.split(METRICS_DELIM);
		return properties.reduce((results, property) => {
			return results[property];
		}, this.results);
	}

}