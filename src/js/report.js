import { Metric } from './metric';
import { el, prettyDate, drawMetricSummary } from './utils';
import WPT from './webpagetest';


class Report {

	constructor(report, viz) {
		console.log('Report', report, viz);
		this.report = report;
		this.viz = viz;
		this.baseUrl = report.url;
		this.startDate = report.startDate;
		this.endDate = report.endDate;

		this.bindChangeListener('startDate');
		this.bindChangeListener('endDate');
		this.bindUpdateListener();
		this.bindTableVisibilityToggle();
		this.permalink = document.getElementById('permalink');

		this.bindPermalinkClick();
		this.updatePermalink();
		this.makeDatesPretty();
	}

	bindChangeListener(id) {
		document.getElementById(id).addEventListener('change', e => {
			this[id] = e.target.value
			this.updatePermalink();
		});
	}

	bindUpdateListener() {
		document.getElementById('update').addEventListener('click', _ => {
			location.href = this.permalink.value;
		});
	}

	bindTableVisibilityToggle() {
		document.body.addEventListener('click', e => {
			if (!e.target.classList.contains('show-hide')) {
				return;
			}

			const isHidden = e.target.innerText.startsWith('Show');
			Array.from(e.target.parentNode.querySelectorAll('table')).forEach(table => {
				table.classList.toggle('hidden', !isHidden);
			});
			e.target.innerText = e.target.innerText.replace(isHidden ? 'Show' : 'Hide', isHidden ? 'Hide' : 'Show');
		});
	}

	isLatest(date) {
		return this.report.dates[0] === date;
	}

	isEarliest(date) {
		return this.report.dates[this.report.dates.length - 1] === date;
	}

	isOneYearAgo(date) {
		return this.report.dates[23] === date;
	}

	getDateUrlAlias(date) {
		if (this.isLatest(date)) {
			return 'latest';
		} else if (this.isEarliest(date)) {
			return 'earliest';
		}

		return date;
	}

	bindPermalinkClick() {
		this.permalink.addEventListener('click', _ => {
			this.permalink.select();
		});
	}

	updatePermalink() {
		if (this.isOneYearAgo(this.startDate) && this.isLatest(this.endDate)) {
			this.permalink.value = this.baseUrl;
			return;
		}

		const url = new URL(this.baseUrl);
		const start = this.getDateUrlAlias(this.startDate);
		const end = this.getDateUrlAlias(this.endDate);

		if (start === end) {
			url.searchParams.append('start', start);
		} else {
			url.searchParams.append('start', start);
			if (end) {
				url.searchParams.append('end', end);
			}
		}

		this.permalink.value = url.toString();
	}

	makeDatesPretty() {
		Array.from(document.querySelectorAll('.yyyy_mm_dd')).forEach(option => {
			const date = prettyDate(option.innerText.trim());
			option.innerText = date;
		});
	}

	getWPT(wptId) {
		const wpt = new WPT(wptId);
		wpt.fetchResults().then(results => {
			const metrics = wpt.getMetrics(this.report);
			Object.entries(metrics).forEach(([metric, value]) => {
				const options = this.report.metrics.find(m => m.id === metric);
				options.metric = metric;
				const m = new Metric(options, value.toFixed(1));
				drawMetricSummary(options, 'webpagetest', m.toString());
			});
		}).catch(e => {
			console.error('Error getting WebPageTest results.', e);
		});
	}
}

window.Report = Report;
