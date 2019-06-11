import { Discussion } from './discussion';

const section = document.getElementById('discuss');
const discussions = document.getElementById('discussions');

function getDiscussTopics() {
	if (!section || !discussions) {
		return;
	}
	let latestTopicIds = new Set();
	fetch(`${Discussion.ORIGIN}/latest.json`).then(r => r.json()).then(r => {
		const topics = r.topic_list.topics.slice(0, 2);
		topics.forEach(topic => latestTopicIds.add(topic.id));
		drawTopics(topics, r.users);
	}).then(_ => {
    return fetch(`${Discussion.ORIGIN}/top.json`);
  }).then(r => r.json()).then(r => {
		const topics = r.topic_list.topics.filter(topic => !latestTopicIds.has(topic.id)).slice(0, 3);
		drawTopics(topics, r.users);
	}).then(_ => section.classList.remove('hidden'))
}

function drawTopics(topics, rUsers) {
	const allUsers = new Map(rUsers.map(user => [user.id, user]));
	if (topics && topics.length && allUsers.size) {
		topics.forEach(topic => {
			const title = topic.title;
			const slug = topic.slug;
			const replies = topic.posts_count;
			const users = topic.posters.map(poster => allUsers.get(poster.user_id));

			drawTopic(title, slug, replies, users);
		});
	}
}

function drawTopic(title, slug, replies, users) {
	const discussion = new Discussion(title, slug, replies, users);
	discussions.appendChild(discussion.toNode());
}

getDiscussTopics();
