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
		this.bindTableVisibilityToggle();
		this.permalink = document.getElementById('permalink');

		this.bindPermalinkClick();
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
}

window.Report = Report;
