import { Metric } from './metric';
import { prettyDate, drawMetricSummary } from './utils';
import WPT from './webpagetest';


class Report {

	constructor(report, viz) {
		console.log('Report', report, viz);
		this.report = report;
		this.viz = viz;
		this.baseUrl = report.url;
		this.lens = report.lens && report.lens.id;
		this.startDate = report.startDate;
		this.endDate = report.endDate;
		this.view = report.view;

		this.bindChangeListener('lens');
		this.bindChangeListener('startDate');
		this.bindChangeListener('endDate');
		this.bindUpdateListener();
		this.bindTableVisibilityToggle();
		this.permalink = document.getElementById('permalink');

		this.bindPermalinkClick();
		this.updatePermalink();
		this.makeDatesPretty();
		this.bindViewToggle();
		this.bindGridExpansion();
		this.expandPreselectedMetric();
	}

	bindChangeListener(id) {
		document.getElementById(id).addEventListener('change', e => {
			this[id] = e.target.value
			this.updatePermalink();
		});
	}

	bindUpdateListener() {
		document.getElementById('update').addEventListener('click', _ => {
			// TODO: Consider using history.replaceState on field changes instead.
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
		const url = new URL(this.baseUrl);
		const lens = this.lens;

		// TODO: Change subdomain.
		if (lens) {
			url.searchParams.set('lens', lens);
		} else {
			url.searchParams.delete('lens');
		}

		if (this.isOneYearAgo(this.startDate) && this.isLatest(this.endDate)) {
			this.permalink.value = url.toString();
			return;
		}

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

		url.searchParams.set('view', this.view);

		this.permalink.value = url.toString();
	}

	makeDatesPretty() {
		Array.from(document.querySelectorAll('.yyyy_mm_dd')).forEach(option => {
			const date = prettyDate(option.innerText.trim());
			option.innerText = date;
		});
	}

	bindViewToggle() {
		const reportMetrics = document.getElementById('report-metrics');
		const gridBtn = document.getElementById('grid-view');
		const listBtn = document.getElementById('list-view');

		const toggleView = (view) => {
			if (view === this.view) {
				return;
			}

			const url = new URL(location.href);
			this.view = view;

			reportMetrics.classList.toggle('grid-view', view === 'grid');
			gridBtn.classList.toggle('alt', view === 'grid');
			listBtn.classList.toggle('alt', view !== 'grid');

			url.searchParams.set('view', view);

			if (view === 'list') {
				// The viz will need to be repainted to maximize the width.
				// We can trigger this with a window resize event.
				this.triggerResize();
			} else {
				// Expand any metric whose ID is in the URL hash.
				this.expandPreselectedMetric({scrollIntoView: false});
			}
			window.history.replaceState({}, '', url.toString());
			this.updatePermalink();
		};

		gridBtn.addEventListener('click', () => toggleView('grid'));
		listBtn.addEventListener('click', () => toggleView('list'));
	}

	triggerResize() {
		window.dispatchEvent(new Event('resize'));
	}

	toggleMetricExpansion(metricId) {
		const metric = document.getElementById(metricId);
		if (!metric) {
			return;
		}
		metric.classList.toggle('expanded');
		this.triggerResize();
	}

	bindGridExpansion() {
		const gridExpanderSelector = '.grid-expansion, .metric-header a';
		Array.from(document.querySelectorAll(gridExpanderSelector)).forEach(btn => {
			const metricId = btn.dataset.metric;
			btn.addEventListener('click', e => {
				this.toggleMetricExpansion(metricId);
			});
		});
	}

	expandPreselectedMetric(options={scrollIntoView:true}) {
		if (this.view !== 'grid') {
			return;
		}

		const anchorMetricId = location.hash.substr(1);
		if (!anchorMetricId) {
			return;
		}

		const metric = document.getElementById(anchorMetricId);
		if (!metric) {
			return;
		}
		this.toggleMetricExpansion(anchorMetricId);
		if (options.scrollIntoView) {
			requestAnimationFrame(() => metric.scrollIntoView());
		}
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
