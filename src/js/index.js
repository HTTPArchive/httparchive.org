import { Discussion } from './discussion.js';

const DISCUSS_ORIGIN = 'https://discuss.httparchive.org';

const section = document.getElementById('discuss');
const discussions = document.getElementById('discussions');

function getDiscussTopics() {
	if (!section || !discussions) {
		return;
	}

	fetch(`${DISCUSS_ORIGIN}/top.json`).then(r => r.json()).then(r => {
		const topics = r.topic_list.topics;
		const allUsers = new Map(r.users.map(user => [user.id, user]));

		if (topics && topics.length && allUsers.size) {
			drawTopics(topics, allUsers);
		}
	}).then(_ => {
		section.classList.remove('hidden');
	});
}

function drawTopics(topics, allUsers) {
	const MAX_TOPICS = 5;
	let i = 0;

	for (const topic of topics) {
		if (i >= MAX_TOPICS) {
			break;
		}

		const title = topic.title;
		const slug = topic.slug;
		const replies = topic.posts_count;
		const users = topic.posters.map(poster => allUsers.get(poster.user_id));

		drawTopic(title, slug, replies, users);
		i++;
	}
}

function drawTopic(title, slug, replies, users) {
	console.log('drawTopic', title, slug, replies, users);

	const discussion = new Discussion(title, slug, replies, users);
	discussions.appendChild(discussion.toNode());
}

getDiscussTopics();
