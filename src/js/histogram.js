import { Colors } from './colors.js';


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
	constructor(id, bins) {
		this.table = document.getElementById(id);
		this.bins = bins;
		this.schema = bins[0].getSchema();
		this.maxPdf = Math.max.apply(null, this.bins.map(bin => bin.pdf));
	}

	draw() {
		Array.from(this.table.children).forEach(child => this.table.removeChild(child));

		const thead = el('thead');
		const headerRow = el('tr');
		this.schema.forEach(col => {
			const th = el('th');
			th.textContent = col;
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
function drawHistogramTable(data, desktopId, mobileId, [start, end]=[-Infinity, Infinity]) {
	if (!redrawHistogramTable) {
		// Return a curried function to redraw the table given start/end times.
		redrawHistogramTable = debounce((dateRange) => {
			return drawHistogramTable(data, desktopId, mobileId, dateRange);
		}, 100);
	}
	
	const bins = data.filter(data => {
		return data.bin >= start && data.bin <= end
	}).map(data => new Bin(data));

	const desktop = bins.filter(data => data.client === 'desktop');
	const mobile = bins.filter(data => data.client === 'mobile');

	(new HistogramTable(desktopId, desktop)).draw();
	(new HistogramTable(mobileId, mobile)).draw();
}

function drawHistogram(data, containerId) {
	data = data.map((data) => new Bin(data));

	let outliers = null;
	let desktop = data.filter(({client}) => client=='desktop').reduce((data, current) => {
		if (current.cdf < 0.95) data.push(current);
		else if (outliers) outliers.add(current);
		else outliers = current;
		return data;
	}, []);
	const desktopOutliers = outliers.clone();

	outliers = null;
	let mobile = data.filter(({client}) => client=='mobile').reduce((data, current) => {
		if (current.cdf < 0.95) data.push(current);
		else if (outliers) outliers.add(current);
		else outliers = current;
		return data;
	}, []);

	let desktopCDF = desktop.map(data => data.toCdfPoint());
	desktopCDF.push(desktopOutliers.toCdfPoint());
	let mobileCDF = mobile.map(data => data.toCdfPoint());
	mobileCDF.push(outliers.toCdfPoint());

	const series = [{
		data: desktop.map((data) => data.toPoint()),
		pointPadding: 0,
		groupPadding: 0,
		pointPlacement: 'between',
		name: 'Desktop'
	},{
		data: mobile.map((data) => data.toPoint()),
		pointPadding: 0,
		groupPadding: 0,
		pointPlacement: 'between',
		name: 'Mobile'
	},{
		data: [desktopOutliers.toPoint()],
		pointPadding: 0,
		groupPadding: 0,
		pointPlacement: 'between',
		name: 'Desktop Outliers',
		showInLegend: false
	},{
		data: [outliers.toPoint()],
		pointPadding: 0,
		groupPadding: 0,
		pointPlacement: 'between',
		name: 'Mobile Outliers',
		showInLegend: false
	},{
		data: desktopCDF,
		type: 'line',
		marker: {
		  enabled: false
		},
		name: 'Desktop CDF',
		yAxis: 1
	},{
		data: mobileCDF,
		type: 'line',
		marker: {
		  enabled: false
		},
		name: 'Mobile CDF',
		yAxis: 1
	}];

	drawChart(series, containerId);
};

Highcharts.setOptions({
	colors: Colors.getAll({rgba: true})
});

function drawChart(series, containerId) {
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
	      text: 'Histogram of JS Bytes'
	  },
	  subtitle: {
	      text: 'Source: <a href="http://httparchive.org">httparchive.org</a>',
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
	          tooltips.push(`<span style="color: ${point.color};">■</span> <b>${point.series.name}:</b> ${Math.round(point.x * 100) / 100} KB (${(point.y).toFixed(2)})`);
	        });
	        return tooltips.join('<br>');
	      },
	      shared: true
	  },
	  xAxis: {
	      title: {
	          text: 'bytesJS (KB)'
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

const el = tagName => document.createElement(tagName);

// https://gist.github.com/beaucharman/1f93fdd7c72860736643d1ab274fee1a
function debounce(callback, wait, context = this) {
  let timeout = null 
  let callbackArgs = null
  
  const later = () => callback.apply(context, callbackArgs)
  
  return function() {
    callbackArgs = arguments
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Export directly to global scope for use by Jinja template.
window.drawHistogram = drawHistogram;
window.drawHistogramTable = drawHistogramTable;
