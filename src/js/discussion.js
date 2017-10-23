const DISCUSS_CDN = 'https://discourse-cdn-sjc1.com/standard';
const DISCUSS_ORIGIN = 'https://discuss.httparchive.org';
const MAX_USERS = 2;

export class Discussion {

	static get CDN() {
		return DISCUSS_CDN;
	}
	static get ORIGIN() {
		return DISCUSS_ORIGIN;
	}

	constructor(title, slug, replies, users) {
		this.title = title;
		this.slug = slug;
		this.replies = replies;
		this.users = users;
	}

	toNode() {
		const tr = document.createElement('tr');
		tr.classList.add('discussion');

		tr.appendChild(this.getTopicNode());
		tr.appendChild(this.getRepliesNode());

		return tr;
	}

	getTopicNode() {
		const topic = document.createElement('td');

		topic.appendChild(this.getUsersNode());
		topic.appendChild(this.getTitleNode());

		return topic;
	}

	getRepliesNode() {
		const replies = document.createElement('td');

		const numReplies = document.createElement('span');
		numReplies.classList.add('discussion-replies');
		numReplies.innerText = this.replies;

		replies.appendChild(numReplies);

		return replies;
	}

	getUsersNode() {
		const users = document.createElement('ul');

		users.classList.add('discussion-users');
		users.classList.add('hidden-xs');

		this.users.slice(0, MAX_USERS).map(user => {
			const li = document.createElement('li');

			const a = document.createElement('a');
			a.href = this.getUserProfileUrl(user);

			const img = document.createElement('img');
			img.classList.add('discussion-user');
			img.src = this.getUserImgUrl(user);
			img.alt = user.username;
			img.title = user.username;

			a.appendChild(img);

			li.appendChild(a);

			return li;
		}).forEach(user => users.appendChild(user));

		if (this.users.length > MAX_USERS) {
			const li = document.createElement('li');

			const remainingUsers = document.createElement('span');
			remainingUsers.classList.add('discussion-users-remaining');
			remainingUsers.innerText = this.users.length - MAX_USERS;

			li.appendChild(remainingUsers);
			users.appendChild(li);
		}

		return users;
	}

	getTitleNode() {
		const title = document.createElement('div');
		title.classList.add('discussion-title');

		const a = document.createElement('a');
		a.href = `${DISCUSS_ORIGIN}/t/${this.slug}`;
		a.innerText = this.title;

		title.appendChild(a);
		return title;
	}

	getUserImgUrl(user) {
		const url = user.avatar_template.replace('{size}', 30);

		// URL may be relative. Prepend CDN origin if so. Return as is if not.
		if (url[0] === '/') {
			return DISCUSS_CDN + url;
		}

		return url;
	}

	getUserProfileUrl(user) {
		return `${DISCUSS_ORIGIN}/u/${user.username}/`;
	}

}
