import { Discussion } from './discussion';

const section = document.getElementById('discuss');
const discussions = document.getElementById('discussions');

function getDiscussTopics() {
	if (!section || !discussions) {
		return;
	}
	let idList = [];
	fetch(`${Discussion.ORIGIN}/top.json`).then(r => r.json()).then(r => {
		const topics = r.topic_list.topics.slice(0, 3);
		topics.map((topic) => idList.push(topic.id));
		const allUsers = new Map(r.users.map(user => [user.id, user]));
		if (topics && topics.length && allUsers.size) {
			drawTopics(topics, allUsers);
		}
	}).then(_ =>
		fetch(`${Discussion.ORIGIN}/latest.json`).then(r => r.json()).then(r => {
			let latest = [];
			let count = 0;
			r.topic_list.topics.map((topic) => {
				if(!idList.includes(topic.id) && count < 2) {
					latest.push(topic);
					count++;
				};
			})
			const topics = latest;
			const allUsers = new Map(r.users.map(user => [user.id, user]));
			if (topics && topics.length && allUsers.size) {
				drawTopics(topics, allUsers);
			}
		})
	).then(_ => section.classList.remove('hidden'))
}

function drawTopics(topics, allUsers) {
	topics.forEach(topic => {
		const title = topic.title;
		const slug = topic.slug;
		const replies = topic.posts_count;
		const users = topic.posters.map(poster => allUsers.get(poster.user_id));

		drawTopic(title, slug, replies, users);
	});
}

function drawTopic(title, slug, replies, users) {
	const discussion = new Discussion(title, slug, replies, users);
	discussions.appendChild(discussion.toNode());
}

getDiscussTopics();
