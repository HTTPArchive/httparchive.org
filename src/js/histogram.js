import { Colors } from './colors.js';
import debounce from './debounce.js';
import { el } from './utils.js';


const [COLOR_DESKTOP, COLOR_MOBILE, COLOR_DESKTOP_ALT, COLOR_MOBILE_ALT] = Colors.getAll({rgba: true});

function histogram(metric, date, options) {
	options.date = date;
	const dataUrl = `http://cdn.httparchive.org/reports/${date}/${metric}.json`;
	fetch(dataUrl)
		.then(response => {
			if (!response.ok) {
				console.error('Error loading histogram data', dataUrl, response);
				return Promise.reject(response.statusText);
			}
			return response.text();
		})
		.then(jsonStr => JSON.parse(jsonStr))
		.then(data => {
			drawHistogram(data, `${metric}-chart`, options);
			drawHistogramTable(data, `${metric}-table-desktop`, `${metric}-table-mobile`, options.type);
		}).catch(e => {
			const chart = document.getElementById(`${metric}-chart`);
			chart.innerText = `Error loading data: ${e}. Try a more recent start date.`;
		});
}

class Bin {
	constructor(data) {
		this.client = data.client;
		this.bin = +data.bin;
		this.volume = +data.volume;
		this.pdf = +data.pdf;
		this.cdf = +data.cdf;
	}

	toPoint() {
		return [this.bin, this.pdf * 100];
	}

	toCdfPoint() {
		return [this.bin, this.cdf * 100];
	}

	toRow(maxPdf) {
		const tr = document.createElement('tr');
		this.getSchema().forEach(col => {
			const td = document.createElement('td');
			if (col === 'volume') {
				const bar = document.createElement('div');
				bar.style.width = (this.pdf * 100 / maxPdf) + '%';
				bar.classList.add(this.client);
				td.appendChild(bar);
				const text = document.createElement('span');
				text.textContent = this.format(col);
				td.appendChild(text);
			}
			else {
				td.textContent = this.format(col);
			}
			td.classList.add(col);
			tr.appendChild(td);
		})
		return tr;
	}

	add(bin) {
		this.volume += bin.volume;
		this.pdf += bin.pdf;
		this.cdf = Math.max(this.cdf, bin.cdf);
	}

	clone() {
		return new Bin({
			client: this.client,
			bin: this.bin,
			volume: this.volume,
			pdf: this.pdf,
			cdf: this.cdf
		});
	}

	format(property) {
		switch(property) {
			case 'pdf':
			case 'cdf':
				let value = (Math.floor(this[property] * 10000) / 100).toFixed(2);
				if (value < 10) {
					value = '0' + value;
				}
				return value + '%';
			case 'volume':
				return this[property].toLocaleString();
			default:
				return this[property];
		}
	}

	getSchema() {
		return ['bin', 'volume', 'pdf', 'cdf'];
	}
}

class HistogramTable {
	constructor(id, bins, type) {
		this.table = document.getElementById(id);
		this.bins = bins;
		this.type = type;
		this.schema = bins[0].getSchema();
		this.maxPdf = Math.max.apply(null, this.bins.map(bin => bin.pdf));
	}

	draw() {
		Array.from(this.table.children).forEach(child => this.table.removeChild(child));

		const thead = el('thead');
		const headerRow = el('tr');
		this.schema.forEach(col => {
			const th = el('th');
			th.textContent = col === 'bin' ? this.type : col;
			headerRow.appendChild(th);
		});
		thead.appendChild(headerRow);
		this.table.appendChild(thead);

		const tbody = el('tbody');
		this.bins.forEach(bin => {
			tbody.appendChild(bin.toRow(this.maxPdf));
		});
		this.table.appendChild(tbody);
	}
}


let redrawHistogramTable = null;
function drawHistogramTable(data, desktopId, mobileId, type, [start, end]=[-Infinity, Infinity]) {
	if (!redrawHistogramTable) {
		// Return a curried function to redraw the table given start/end bins.
		redrawHistogramTable = debounce((dateRange) => {
			return drawHistogramTable(data, desktopId, mobileId, type, dateRange);
		}, 100);
	}
	
	const bins = data.filter(data => {
		return data.bin >= start && data.bin <= end
	}).map(data => new Bin(data));

	const desktop = bins.filter(data => data.client === 'desktop');
	const mobile = bins.filter(data => data.client === 'mobile');

	if (desktop.length) {
		(new HistogramTable(desktopId, desktop, type)).draw();
	}
	if (mobile.length) {
		(new HistogramTable(mobileId, mobile, type)).draw();
	}
}

function drawHistogram(data, containerId, options) {
	// If there are more than this many bins in the dataset, group everything above 95%.
	const OUTLIER_MIN = 100;
	data = data.map((data) => new Bin(data));

	let outliers = null;
	let desktop = data.filter(({client}) => client=='desktop').reduce((data, current, i, desktop) => {
		if (current.cdf < 0.95 || desktop.length < OUTLIER_MIN) data.push(current);
		else if (outliers) outliers.add(current);
		else outliers = current;
		return data;
	}, []);
	const desktopOutliers = outliers && outliers.clone();

	outliers = null;
	let mobile = data.filter(({client}) => client=='mobile').reduce((data, current, i, mobile) => {
		if (current.cdf < 0.95 || mobile.length < OUTLIER_MIN) data.push(current);
		else if (outliers) outliers.add(current);
		else outliers = current;
		return data;
	}, []);

	let desktopCDF = desktop.map(data => data.toCdfPoint());
	if (desktopOutliers) {
		desktopCDF.push(desktopOutliers.toCdfPoint());
	}
	let mobileCDF = mobile.map(data => data.toCdfPoint());
	if (outliers) {
		mobileCDF.push(outliers.toCdfPoint());
	}

	const series = [];
	if (desktop.length) {
		series.push({
			data: desktop.map((data) => data.toPoint()),
			pointPadding: 0,
			groupPadding: 0,
			pointPlacement: 'between',
			name: 'Desktop',
			color: COLOR_DESKTOP
		});
		series.push({
			data: desktopCDF,
			type: 'line',
			marker: {
			  enabled: false
			},
			name: 'Desktop CDF',
			color: COLOR_DESKTOP_ALT,
			yAxis: 1
		});
	}
	if (mobile.length) {
		series.push({
			data: mobile.map((data) => data.toPoint()),
			pointPadding: 0,
			groupPadding: 0,
			pointPlacement: 'between',
			name: 'Mobile',
			color: COLOR_MOBILE
		});
		series.push({
			data: mobileCDF,
			type: 'line',
			marker: {
			  enabled: false
			},
			name: 'Mobile CDF',
			color: COLOR_MOBILE_ALT,
			yAxis: 1
		});
	}
	if (desktopOutliers) {
		series.push({
			data: [desktopOutliers.toPoint()],
			pointPadding: 0,
			groupPadding: 0,
			pointPlacement: 'between',
			name: 'Desktop Outliers',
			color: COLOR_DESKTOP,
			showInLegend: false
		});
	}
	if (outliers) {
		series.push({
			data: [outliers.toPoint()],
			pointPadding: 0,
			groupPadding: 0,
			pointPlacement: 'between',
			name: 'Mobile Outliers',
			color: COLOR_MOBILE,
			showInLegend: false
		});
	}

	drawChart(series, containerId, options);
};

function drawChart(series, containerId, options) {
	Highcharts.chart(containerId, {
		chart: {
			type: 'column',
				zoomType: 'x',
				resetZoomButton: {
				position: {
					x: 0,
					y: -50
				}
			},
		},
	  title: {
	      text: `Histogram of ${options.name}`
	  },
	  subtitle: {
	      text: `Source: <a href="http://httparchive.org">httparchive.org</a> (${options.date})`,
	      useHTML: true
	  },
	  plotOptions: {
	    column: {
	      grouping: false
	    }
	  },
	  tooltip: {
	      formatter: function() {
	        const tooltips = [];
	        this.points.forEach(point => {
	          tooltips.push(`<span style="color: ${point.color};">■</span> <b>${point.series.name}:</b> ${Math.round(point.x * 100) / 100} ${options.type} (${(point.y).toFixed(2)})`);
	        });
	        return tooltips.join('<br>');
	      },
	      shared: true
	  },
	  xAxis: {
	      title: {
	          text: options.type
	      },
		  events: {
			setExtremes: e => redrawHistogramTable([e.min || -Infinity, e.max || Infinity])
		  }
	  },
	  yAxis: [{
	      title: {
	          text: 'Volume'
	      }
	  }, {
	    title: {
	      text: 'CDF (%)'
	    },
	    max: 100,
	    opposite: true
	  }],
	  series,
	  credits: false
	});
}

// Export directly to global scope for use by Jinja template.
window.histogram = histogram;
