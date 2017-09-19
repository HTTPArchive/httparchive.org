#!/usr/bin/env node
/**
 * Updates dates.json with the available report dates on Google Storage.
 */

const { exec } = require('child_process');
const fs = require('fs');

// Command that lists all reports, including timeseries JSON files and dated subdirs.
const listReportsCmd = 'gsutil ls gs://httparchive/reports/';

exec(listReportsCmd, (err, reports, stderr) => {
	if (err || stderr) {
		console.error(err || stderr);
		return;
	}

	const dates = reports.split('\n').filter(report => {
		// Filter out files. We're only interested in the dated subdirs.
		return report && report.endsWith('/');
	}).map(report => {
		// Strip away everything but the date.
		return report.replace('gs://httparchive/reports/', '').replace('/', '');
	}).sort((a, b) => {
		// Sort in reverse chronological order (newer first).
		return a > b ? -1 : 1;
	});

	const dateStr = JSON.stringify(dates, null, 2) + '\n';

	// Update the config file.
	fs.writeFile('config/dates.json', dateStr, 'utf8', (err) => {
		if (err) {
			console.error(err);
		}

		console.log('Updated config/dates.json');
	});
});
