const BLOG_API_ENDPOINT = 'https://dev.to/api/articles?username=httparchive';
const MAX_POSTS = 3;

export class BlogRenderer {

  renderPosts(container, template) {
    const frag = document.createDocumentFragment();
    return fetch(BLOG_API_ENDPOINT).then(r => {
      return r.json();
    }).then(posts => {
      // Sort posts newest to oldest.
      // Filter for the `MAX_POSTS` most recent posts.
      // Generate the post DOM.
      posts.sort((a, b) => {
        return BlogPostRenderer.getPublishDate(b) - BlogPostRenderer.getPublishDate(a);
      }).filter((post, i) => {
        return i < MAX_POSTS;
      }).forEach(blogPost => {
        const postRenderer = new BlogPostRenderer(blogPost, template);
        frag.appendChild(postRenderer.render());
      });
      container.appendChild(frag);
    });
  }

}

class BlogPostRenderer {

  static getPublishDate(post) {
    return new Date(post.published_at);
  }

  constructor(post, template) {
    this.post = post;
    this.template = template.content.cloneNode(true);
  }

  render() {
    this.renderTitle();
    this.renderByline();
    this.renderTags();
    this.renderAuthorAvatar();
    this.renderReactions();

    return this.template;
  }

  renderTitle() {
    const title = this.template.querySelector('.blog-post-title');
    title.href = this.post.url;
    title.innerText = this.post.title;
  }

  renderByline() {
    const byline = this.template.querySelector('.blog-post-byline');

    const author = byline.querySelector('.blog-post-author');
    author.href = this.getAuthorURL();
    author.innerText = this.post.user.name;

    const publicationDate = byline.querySelector('.blog-post-publication-date');
    publicationDate.innerText = this.post.readable_publish_date;
  }

  renderAuthorAvatar() {
    const author = this.template.querySelector('.blog-post-author-avatar');
    author.href = this.getAuthorURL();

    const authorAvatar = author.querySelector('img');
    authorAvatar.src = this.post.user.profile_image_90;
    authorAvatar.title = this.post.user.name;
  }

  renderTags() {
    const tags = this.template.querySelector('.blog-post-tags');
    const tagTemplate = tags.querySelector('a');

    this.post.tag_list.forEach(tagName => {
      let tag = tagTemplate.cloneNode(true);
      tag.href = this.getTagURL(tagName);
      tag.innerText = `#${tagName}`;
      tags.appendChild(tag);
    });

    tagTemplate.remove();
  }

  renderReactions() {
    const reactions = this.template.querySelector('.blog-post-reactions');

    const likes = reactions.querySelector('.blog-post-likes');
    likes.href = this.post.url;

    const numLikes = likes.querySelector('span');
    numLikes.innerText = this.post.positive_reactions_count;

    const comments = reactions.querySelector('.blog-post-comments');
    comments.href = `${this.post.url}#comments`;

    const numComments = comments.querySelector('span');
    numComments.innerText = this.post.comments_count;
  }

  getAuthorURL() {
    return `https://dev.to/${this.post.user.username}`;
  }

  getTagURL(tag) {
    return `https://dev.to/t/${tag}`;
  }

}