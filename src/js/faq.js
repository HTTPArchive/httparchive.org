import Changelog from './changelog';
import { el, getFullDate } from './utils';

function generateQuestionAnchors(anchors) {
  const answers = document.getElementById('answers');
  const questions = Array.from(answers.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  questions.forEach(heading => {
    const anchor = anchors[heading.innerText];
    if (!anchor) {
      return;
    }
    heading.id = anchor;
  });
  anchors = new Set(Object.values(anchors).map(a => `#${a}`));
  addEventListener('load', () => maybeScrollToAnchor(anchors));
}

function generateChangelog() {
  const changelogLink = document.querySelector('a[href$="changelog.json"]');
  if (!changelogLink) {
    return;
  }
  const root = changelogLink.parentElement;
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
      desc.innerText = change.desc;
      if (change.more) {
        const more = el('p');
        const text = document.createTextNode('See also: ');
        more.appendChild(text);
        change.more.forEach((o, i) => {
          const [[label, url]] = Object.entries(o);
          const a = el('a');
          a.href = url;
          a.innerText = label;
          more.appendChild(a);
          if (i < change.more.length - 1) {
            const text = document.createTextNode(', ');
            more.appendChild(text);
          }
        });
        desc.appendChild(more);
      }
      dl.appendChild(desc);
    });
    root.appendChild(dl);
    addEventListener('load', () => maybeScrollToAnchor(anchors));
  });
}

// Because the anchors are assigned asynchronously, URL anchors will not
// automatically jump to the scroll position of the anchor. This function
// manually scrolls to the anchor if it is a known anchor.
function maybeScrollToAnchor(anchors) {
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
window.generateQuestionAnchors = generateQuestionAnchors;
window.generateChangelog = generateChangelog;
