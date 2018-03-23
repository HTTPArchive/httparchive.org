import { Colors } from './colors';
import debounce from './debounce';
import { Metric } from './metric';
import { el, prettyDate, chartExportOptions } from './utils';


const [COLOR_DESKTOP, COLOR_MOBILE, COLOR_DESKTOP_ALT, COLOR_MOBILE_ALT] = Colors.getAll({rgba: true});
window.charts = {};

function histogram(metric, date, options) {
	options.date = date;
	options.metric = metric;
	const dataUrl = `https://cdn.httparchive.org/reports/${date}/${metric}.json`;
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

function drawClientSummary(data, options, client) {
	if (!data.length) {
		return;
	}

	const summary = getSummaryElement(options.id, client);
	summary.classList.remove('hidden');

	summary.querySelector('.primary').innerText = getSummary(data, options);
}

function getSummaryElement(metric, client) {
	return document.querySelector(`#${metric} .metric-summary.${client}`);
}

function getSummary(data, options) {
	const summary = getPrimaryMetric(data, options);
	const metric = new Metric(options, summary);
	
	return metric.toString();
}

function getPrimaryMetric(data, options) {
	data = data.filter(o => +o.cdf > 0.5);
	if (!data.length) {
		return '?';
	}
	return data[0].bin;
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
	// Outliers must be at least this bin index, regardless of CDF.
	// This guarantees 30 bins worth of non-outlier data.
	// Important for histograms that are extremely skewed,
	// eg where the first bin is already 90+% PDF.
	const OUTLIER_MIN = 30;
	data = data.map((data) => new Bin(data));

	let desktop = data.filter(({client}) => client=='desktop');
	let mobile = data.filter(({client}) => client=='mobile')

	const max = Math.max(OUTLIER_MIN,
		desktop.filter(current => current.cdf < 0.95).length,
		mobile.filter(current => current.cdf < 0.95).length);

	desktop = desktop.filter((_, i) => i < max);
	mobile = mobile.filter((_, i) => i < max);

	let desktopCDF = desktop.map(data => data.toCdfPoint());
	let mobileCDF = mobile.map(data => data.toCdfPoint());

	// Draw summary metrics (derived median).
	drawClientSummary(desktop, options, 'desktop');
	drawClientSummary(mobile, options, 'mobile');

	// Draw summary metrics (derived median).
	drawClientSummary(desktop, options, 'desktop');
	drawClientSummary(mobile, options, 'mobile');

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
				enabled: false,
				states: {
					hover: {
						enabled: false
					}
				}
			},
			name: 'Desktop CDF',
			color: COLOR_DESKTOP_ALT,
			yAxis: 1,
			showInLegend: false
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
				enabled: false,
				states: {
					hover: {
						enabled: false
					}
				}
			},
			name: 'Mobile CDF',
			color: COLOR_MOBILE_ALT,
			yAxis: 1,
			showInLegend: false
		});
	}

	drawChart(series, containerId, options);
};

function drawChart(series, containerId, options) {
	const chart = Highcharts.chart(containerId, {
		metric: options.metric,
		type: 'histogram',
		date: options.date,
		chart: {
			type: 'column',
			zoomType: 'x',
			resetZoomButton: {
				position: {
					x: 0,
					y: -50
				}
			}
		},
		title: {
			text: `Histogram of ${options.name}`
		},
		subtitle: {
			text: `Source: <a href="http://httparchive.org">httparchive.org</a> (${prettyDate(options.date)})`,
			useHTML: true
		},
		plotOptions: {
			column: {
				grouping: false
			},
			series: {
				events: {
					// Keep CDF visibility in sync.
					hide: function() {
						const cdf = chart.series.find(s => s.name === `${this.name} CDF`);
						if (cdf) {
							cdf.hide();
						}
					},
					show: function() {
						const cdf = chart.series.find(s => s.name === `${this.name} CDF`);
						if (cdf) {
							cdf.show();
						}
					}
				}
			}
		},
		tooltip: {
			shared: true,
			useHTML: true,
			borderColor: 'rgba(247,247,247,0.85)',
			formatter: function() {
				const metric = new Metric(options, Math.round(this.points[0].x * 100) / 100);
				const tooltips = this.points.filter(p => !p.series.name.includes('CDF')).map((point, points) => {
					const cdf = this.points.find(p => p.series.name == `${point.series.name} CDF`);
					return `<td>
						<p style="text-transform: uppercase; font-size: 10px;">
							${point.series.name}
						</p>
						<p style="color: ${point.color.replace('0.4', '1')}; font-size: 20px;">
							${(point.y).toFixed(2)}%
						</p>
						${cdf ? 
						`<p style="text-transform: uppercase; font-size: 8px; color: #777;">
							Cumulative
						</p>
						<p style="color: ${point.color.replace('0.4', '1')}; font-size: 14px;">
							${(cdf.y).toFixed(2)}%
						</p>` : ''}
					</td>`;
				});
				return `<p style="text-align: center;">
					${metric.toString()}
				</p>
				<table cellpadding="5" style="text-align: center;">
					<tr>
						${tooltips.join('')}
					</tr>
				</table>`;
			}
		},
		xAxis: {
			title: {
				text: options.type
			},
			events: {
				setExtremes: e => redrawHistogramTable([e.min || -Infinity, e.max || Infinity])
			}
			// TODO: Set the x-axis maximum to the max of desktop/mobile 95%iles.
			// Graph all bins and remove the special outlier bin. By changing the
			// default zoom, we can achieve the same effect without the confusion.
		},
		yAxis: [{
			title: {
				text: 'Density'
			},
			labels: {
				format: '{value}%'
			}
		}, {
			title: {
				text: 'Cumulative Density'
			},
			labels: {
				format: '{value}%'
			},
			max: 100,
			opposite: true
		}],
		series,
		credits: false,
		exporting: chartExportOptions
	});

	charts[options.id] = chart;
}

// Export directly to global scope for use by Jinja template.
window.histogram = histogram;
