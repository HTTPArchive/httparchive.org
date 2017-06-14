const METRIC = 'JS Bytes';
const UNIT = 'KB';
const changelogUrl = 'https://raw.githubusercontent.com/HTTPArchive/httparchive/master/docs/changelog.json';
function drawTimeseries(data, container) {
	data = data.map(toNumeric);
	const desktop = data.filter(isDesktop);
	const mobile = data.filter(isMobile);

	getFlagSeries().then(flagSeries => {
		drawChart([
			getLineSeries('Desktop', desktop.map(toLine), Colors.DESKTOP),
			getAreaSeries('Desktop', desktop.map(toIQR), Colors.DESKTOP),
			getLineSeries('Mobile', mobile.map(toLine), Colors.MOBILE),
			getAreaSeries('Mobile', mobile.map(toIQR), Colors.MOBILE),
			flagSeries
		]);
	})
}
function drawTimeseriesTable(data, container) {
	Promise.resolve(zip(data)).then(data => {
		const table = document.getElementById(container);
		const frag = document.createDocumentFragment();
		const tr = el('tr');
		cols.map(col => {
			const th = el('th');
			th.textContent = col;
			return th;
		}).forEach(th => tr.appendChild(th));
		frag.appendChild(tr);

		data.forEach(([date, arr]) => {
			arr.forEach((o, i) => frag.appendChild(toRow(o, i, arr.length)));
		});
		table.appendChild(frag);
	});
}

const isDesktop = o => o.client == 'desktop';
const isMobile = o => o.client == 'mobile';
const toNumeric = o => ({
	timestamp: +o.timestamp,
	p25: o.p25 / 1024,
	p50: o.p50 / 1024,
	p75: o.p75 / 1024,
	client: o.client
});
const toIQR = o => [o.timestamp, o.p25, o.p75];
const toLine = o => [o.timestamp, o.p50];  
const getLineSeries = (name, data, color) => ({
	name,
	type: 'line',
	data,
	color,
	zIndex: 1,
	marker: {
		enabled: false
	}
});
const getAreaSeries = (name, data, color) => ({
	name,
	type: 'areasplinerange',
	linkedTo: ':previous',
	data,
	lineWidth: 0,
	color,
	fillOpacity: 0.1,
	zIndex: 0,
	marker: {
		enabled: false
	}
});
const flags = {};
const getFlagSeries = () => fetch(changelogUrl)
	.then(response => response.json())
	.then(data => {
		data.forEach(change => {
			flags[+change.date] = {
				title: change.title,
				desc: change.desc
			};
		});
		return {
			type: 'flags',
			name: 'Changelog',
			data: data.map((change, i) => ({
				x: change.date,
				title: String.fromCharCode(65 + i)
			})),
			color: '#90b1b6',
			y: 25
		};
	});
const Colors = {
	DESKTOP: '#04c7fd',
	MOBILE: '#a62aa4'
};

function drawChart(series) {
	Highcharts.stockChart('container', {
		chart: {
			zoomType: 'x'
		},
		title: {
			text: `Timeseries of ${METRIC}`
		},
		subtitle: {
			text: 'Source: <a href="http://httparchive.org">httparchive.org</a>',
			useHTML: true
		},
		legend: {
			enabled: true
		},
		tooltip: {
			crosshairs: true,
			shared: true,
			useHTML: true,
			borderColor: 'rgba(247,247,247,0.85)',
			formatter: function() {
				function getRow([median, iqr]) {
					if (!median || !iqr) return '';
					return `<tr>
						<td><span style="color: ${median.series.color}">&bull;</span> ${median.series.name}</td>
						<th>${iqr.point.low.toFixed(1)}</th>
						<th>${median.point.y.toFixed(1)}</th>
						<th>${iqr.point.high.toFixed(1)}</th>
					</tr>`;
				}
				function getChangelog(changelog) {
					if (!changelog) return '';
					return `<p class="changelog">* ${changelog.title}</p>`;
				}
				const desktop = this.points.filter(o => o.series.name == 'Desktop');
				const mobile = this.points.filter(o => o.series.name == 'Mobile');
				const changelog = flags[this.x];
				return `<p style="font-size: smaller;">${Highcharts.dateFormat('%A, %b %e, %Y', this.x)}${changelog ? '*' : ''}</p>
				<table cellpadding="5">
					<tr>
					<td></td>
					<td style="font-size: smaller;">25%ile</td>
					<td style="font-size: smaller;">50%ile</td>
					<td style="font-size: smaller;">75%ile</td>
				</tr>
				${getRow(desktop)}
				${getRow(mobile)}
				</table>
				${getChangelog(changelog)}`;
			}
		},
		xAxis: {
			type: 'datetime'
		},
		yAxis: {
			title: {
				text: `${METRIC} (${UNIT})`
			},
			opposite: false,
			min: 0
		},
		series,
		credits: false
	});
}

const cols = ['timestamp', 'client', 'p10', 'p25', 'p50', 'p75', 'p90'];
const toKB = bytes => (bytes / 1024).toFixed(1);
const formatters = {
	timestamp: timestamp => {
  	const d = new Date(+timestamp);
    return d.toLocaleDateString(undefined, {month: '2-digit', day: '2-digit', year: 'numeric'});
  },
  p10: toKB,
  p25: toKB,
  p50: toKB,
  p75: toKB,
  p90: toKB
};

const zip = data => {
	const dates = {};
  data.forEach(o => {
  	let row = dates[o.date];
  	if (row) {
    	row.push(o);
      row.sort((a, b) => a.client == 'desktop' ? -1 : 1)
      return;
    }
    dates[o.date] = [o];
  });
  return Object.entries(dates).sort(([a], [b]) => a > b ? -1 : 1);
};

const toRow = (o, i, n) => {
	const row = el('tr');
  cols.map(col => {
  	const td = el('td');
    let text = o[col];
    const formatter = formatters[col];
    if (formatter) {
    	text = formatter(o[col]);
    }
    td.textContent = text;
    if (col == 'ztimestamp' && n == 2) {
    	if (i == 0) {
        td.setAttribute('rowspan', 2);
      } else {
      	return null;
      }
    }
    return td;
  }).forEach(td => td && row.appendChild(td));
  return row;
};

const el = tagName => document.createElement(tagName);
