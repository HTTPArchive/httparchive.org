#!/usr/bin/env node
/**
 * Takes a list of HAR tables and copies them to their respective datasets.
 */

const { exec } = require('child_process');

const fromDataset = process.argv[2];

let tables = [];

function getDate(table) {
	return table.substr(0, 10);
}

function copyTables(suffix, toDataset, client) {
	tables.filter(t => t.endsWith(suffix)).forEach(table => {
		const d = getDate(table);
		console.log(`bq --nosynchronous_mode cp -n ${`${fromDataset}.${table}`} ${`${toDataset}.${d}_${client}`}`);
		//copyTable(`har.${table}`, `${dataset}.${d}_${client}`);
	});
}

exec(`bq ls --format sparse --max_results 100000 ${fromDataset} | grep TABLE`, (err, result, stderr) => {
	if (err || stderr) {
		console.log(`Error listing dataset ${fromDataset}`);
		return;
	}

	tables = result.split(' ').map(t => t.trim()).filter(t => t && t !== 'TABLE');
	
	if (fromDataset === 'har') {
		copyTables('chrome_pages', 'pages', 'desktop');
		copyTables('android_pages', 'pages', 'mobile');
		copyTables('chrome_requests', 'requests', 'desktop');
		copyTables('android_requests', 'requests', 'mobile');
		copyTables('chrome_requests_bodies', 'response_bodies', 'desktop');
		copyTables('android_requests_bodies', 'response_bodies', 'mobile');
		copyTables('chrome_lighthouse', 'lighthouse', 'desktop');
		copyTables('android_lighthouse', 'lighthouse', 'mobile');
	} else if (fromDataset === 'runs') {
		copyTables('pages', 'summary_pages', 'desktop');
		copyTables('pages_mobile', 'summary_pages', 'mobile');
		copyTables('requests', 'summary_requests', 'desktop');
		copyTables('requests_mobile', 'summary_requests', 'mobile');
	}
});
