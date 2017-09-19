#!/usr/bin/env node
/**
 * Adds a single date to dates.json if it doesn't already exist.
 *
 * Usage:
 *
 *     node sql/addDate.js 2017_09_01
 *
 */

const fs = require('fs');


const date = process.argv[2];
if (!date) {
	console.error(`You must pass a YYYY_MM_DD-formatted date as input. For example:
	sql/addDate.js 2017_09_01`);
	process.exit(1);
}

fs.readFile('config/dates.json', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}

	// Use a set to dedupe.
	let dates = new Set(JSON.parse(data));
	dates.add(date);
	dates = Array.from(dates).sort((a, b) => {
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
