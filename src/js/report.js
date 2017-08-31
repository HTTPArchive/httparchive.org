class Report {

	constructor(report) {
		console.log('Report', report);
		this.report = report;
		this.baseUrl = report.url;
		this.startDate = report.startDate;
		this.endDate = report.endDate;

		this.bindChangeListener('startDate');
		this.bindChangeListener('endDate');
		this.bindUpdateListener();
		this.permalink = document.getElementById('permalink');

		this.updatePermalink();
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

	isLatest(date) {
		return this.report.dates[0] === date;
	}

	isEarliest(date) {
		return this.report.dates[this.report.dates.length - 1] === date;
	}

	getDateUrlAlias(date) {
		if (this.isLatest(date)) {
			return 'latest';
		} else if (this.isEarliest(date)) {
			return 'earliest';
		}

		return date;
	}

	updatePermalink() {
		if (this.isEarliest(this.startDate) && this.isLatest(this.endDate)) {
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
}

window.Report = Report;
