import Changelog from './changelog';
import { el, getFullDate } from './utils';

function generateChangelog(anchor) {
	const root = document.querySelector(`#${anchor} + p`);
	fetch(Changelog.URL).then(response => response.json()).then(log => {
		// Reset the content of the changelog root.
		root.innerHTML = '';
		const anchors = new Set();
		const dl = el('dl');
		log.sort((a, b) => {
			// Newest changes first.
			return b.date - a.date;
		}).forEach(change => {
			const date = el('dt');
			date.id = `change-${change.date}`;
			anchors.add(`#${date.id}`);
			const fullDate = getFullDate(new Date(change.date));
			date.innerText = `${fullDate}: ${change.title}`;
			dl.appendChild(date);
			const desc = el('dd');
			// This description may contain URLs.
			// We are intentionally NOT converting them to clickable anchors
			// to avoid an entire class of XSS attacks.
			desc.innerText = change.desc;
			dl.appendChild(desc);
		});
		root.appendChild(dl);
		// The browser seems to wait to set the default scroll position until after load.
		addEventListener('load', () => maybeScrollToChange(anchors));
	});
}

// Because the changelog is loaded asynchronously, URL anchors will not
// automatically jump to the scroll position of the change. This function
// manually scrolls to the change if it is a known changelog anchor.
function maybeScrollToChange(anchors) {
	if (!location.hash) {
		return;
	}
	if (!anchors.has(location.hash)) {
		return;
	}

	const el = document.querySelector(location.hash);
	if (el && el.scrollIntoView) {
		requestAnimationFrame(() => el.scrollIntoView());
	}
}

// Expose to global scope for access in jinja template.
window.generateChangelog = generateChangelog;
