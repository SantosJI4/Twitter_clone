class CommentsManager {
  constructor() {
    this.currentPost = null;
    this.currentComments = [];
    this.replyingTo = null;
    this.isLoading = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('close-comments-btn')?.addEventListener('click', () => this.closeComments());
    document.getElementById('close-reply-btn')?.addEventListener('click', () => this.closeReply());

    document.getElementById('post-comments-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('post-comments-backdrop')) this.closeComments();
    });

    document.getElementById('reply-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('reply-backdrop')) this.closeReply();
    });

    this.setupTextarea('comment-textarea', 'comment-char-count', 'submit-comment-btn', () => this.submitComment());
    this.setupTextarea('reply-textarea', 'reply-char-count', 'submit-reply-btn', () => this.submitReply());
  }

  setupTextarea(textareaId, countId, btnId, submitFn) {
    const textarea = document.getElementById(textareaId);
    const btn = document.getElementById(btnId);
    if (!textarea || !btn) return;

    textarea.addEventListener('input', () => {
      document.getElementById(countId).textContent = `${textarea.value.length}/280`;
      btn.disabled = !textarea.value.trim();
    });

    btn.addEventListener('click', submitFn);

    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter' && textarea.value.trim()) submitFn();
    });
  }

  async openCommentsModal(postId) {
    try {
      this.isLoading = true;
      const modal = document.getElementById('post-comments-modal');
      if (!modal) return;
      modal.classList.add('active');

      const post = await api.getPost(postId);
      this.currentPost = post;
      this.renderOriginalPost(post);

      const data = await api.getPostComments(postId);
      this.currentComments = data.results || data;
      this.renderComments(this.currentComments);

      this.updateFormAvatars();

      document.getElementById('comment-textarea').value = '';
      document.getElementById('comment-char-count').textContent = '0/280';
      document.getElementById('submit-comment-btn').disabled = true;
      this.isLoading = false;
    } catch (error) {
      alert('Erro ao carregar comentários: ' + error.message);
      this.closeComments();
    }
  }

  renderOriginalPost(post) {
    document.querySelector('.post-comments-original-post').innerHTML = `
      <div class="original-post-card">
        <div class="original-post-header">
          <img src="${Utils.avatarUrl(post.author)}" alt="Avatar" class="post-avatar user-avatar-link" data-username="${post.author.username}">
          <div class="original-post-info">
            <div class="original-post-author">
              <strong>${Utils.fullName(post.author)}</strong>
              <a href="javascript:void(0)" class="username user-link" data-username="${post.author.username}">@${post.author.username}</a>
            </div>
            <div class="original-post-time">${Utils.formatTimeAgo(post.created_at)}</div>
          </div>
        </div>
        <div class="original-post-content">${post.content}</div>
        ${post.image ? `<img src="${post.image}" class="original-post-image" alt="Post image">` : ''}
        <div class="original-post-stats">
          <span class="stat"><strong>${post.comments_count}</strong> Comentários</span>
          <span class="stat"><strong>${post.likes_count}</strong> Curtidas</span>
          <span class="stat"><strong>${post.reposts_count}</strong> Repostas</span>
        </div>
      </div>`;
  }

  renderCommentThread(comment, level = 0) {
    const currentUserId = window.app?.currentUser?.id;
    return `
      <div class="comment-item" data-comment-id="${comment.id}" data-level="${level}">
        <div class="comment-header">
          <img src="${Utils.avatarUrl(comment.author)}" alt="Avatar" class="comment-avatar user-avatar-link" data-username="${comment.author.username}">
          <div class="comment-info">
            <div class="comment-author">
              <strong>${Utils.fullName(comment.author)}</strong>
              <a href="javascript:void(0)" class="username user-link" data-username="${comment.author.username}">@${comment.author.username}</a>
              <span class="comment-time">${Utils.formatTimeAgo(comment.created_at)}</span>
            </div>
          </div>
        </div>
        <div class="comment-content">${comment.content}</div>
        <div class="comment-actions">
          <button class="action-btn reply-btn" data-comment-id="${comment.id}">
            <i class="fas fa-reply"></i>
            <span>${comment.replies_count > 0 ? comment.replies_count : ''}</span>
          </button>
          <button class="action-btn like-btn ${comment.is_liked ? 'liked' : ''}" data-comment-id="${comment.id}">
            <i class="fas fa-heart"></i>
            <span>${comment.likes_count > 0 ? comment.likes_count : ''}</span>
          </button>
          ${currentUserId === comment.author.id ? `
            <button class="action-btn delete-btn" data-comment-id="${comment.id}">
              <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
        ${comment.replies?.length ? `
          <div class="comment-replies">
            ${comment.replies.map(r => this.renderCommentThread(r, level + 1)).join('')}
          </div>` : ''}
      </div>`;
  }

  renderComments(comments) {
    const container = document.querySelector('.post-comments-list');

    if (!comments.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
        </div>`;
      return;
    }

    container.innerHTML = comments.map(c => this.renderCommentThread(c)).join('');
    this.bindCommentActions();
  }

  bindCommentActions() {
    document.querySelectorAll('.comment-item .reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const comment = this.findComment(parseInt(btn.dataset.commentId));
        if (comment) this.openReplyModal(comment);
      });
    });

    document.querySelectorAll('.comment-item .like-btn').forEach(btn => {
      btn.addEventListener('click', () => this.likeComment(parseInt(btn.dataset.commentId), btn));
    });

    document.querySelectorAll('.comment-item .delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja deletar este comentário?')) {
          this.deleteComment(parseInt(btn.dataset.commentId));
        }
      });
    });
  }

  findComment(id, comments = this.currentComments) {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = this.findComment(id, comment.replies);
        if (found) return found;
      }
    }
    return null;
  }

  openReplyModal(comment) {
    this.replyingTo = comment;
    document.getElementById('replying-to-name').textContent = `@${comment.author.username}`;

    document.querySelector('.reply-original-comment').innerHTML = `
      <div class="reply-original-comment-card">
        <div class="reply-original-header">
          <img src="${Utils.avatarUrl(comment.author)}" alt="Avatar" class="avatar user-avatar-link" data-username="${comment.author.username}">
          <div class="reply-original-info">
            <strong>${Utils.fullName(comment.author)}</strong>
            <a href="javascript:void(0)" class="user-link" data-username="${comment.author.username}">@${comment.author.username}</a>
          </div>
        </div>
        <div class="reply-original-content">${comment.content}</div>
      </div>`;

    document.getElementById('reply-textarea').value = '';
    document.getElementById('reply-char-count').textContent = '0/280';
    document.getElementById('submit-reply-btn').disabled = true;
    this.updateFormAvatars();
    document.getElementById('reply-modal').classList.add('active');
  }

  async submitComment() {
    const textarea = document.getElementById('comment-textarea');
    const content = textarea.value.trim();
    if (!content || !this.currentPost) return;

    try {
      document.getElementById('submit-comment-btn').disabled = true;
      const comment = await api.createComment(this.currentPost.id, content);
      this.currentComments.push(comment);
      this.currentPost.comments_count++;
      this.renderComments(this.currentComments);
      textarea.value = '';
      document.getElementById('comment-char-count').textContent = '0/280';
    } catch {
      alert('Erro ao enviar comentário');
    }
  }

  async submitReply() {
    const textarea = document.getElementById('reply-textarea');
    const content = textarea.value.trim();
    if (!content || !this.replyingTo || !this.currentPost) return;

    try {
      document.getElementById('submit-reply-btn').disabled = true;
      const reply = await api.createComment(this.currentPost.id, content, this.replyingTo.id);
      if (!this.replyingTo.replies) this.replyingTo.replies = [];
      this.replyingTo.replies.push(reply);
      this.replyingTo.replies_count++;
      this.renderComments(this.currentComments);
      this.closeReply();
    } catch {
      alert('Erro ao enviar resposta');
    }
  }

  async likeComment(commentId, button) {
    try {
      await api.likeComment(commentId);
      button.classList.toggle('liked');
      const comment = this.findComment(commentId);
      if (comment) {
        comment.is_liked = !comment.is_liked;
        comment.likes_count = comment.is_liked
          ? (comment.likes_count || 0) + 1
          : Math.max(0, (comment.likes_count || 1) - 1);
        const span = button.querySelector('span');
        if (span) span.textContent = comment.likes_count > 0 ? comment.likes_count : '';
      }
    } catch { /* silent */ }
  }

  async deleteComment(commentId) {
    try {
      await api.deleteComment(commentId);
      const remove = (comments) => {
        for (let i = 0; i < comments.length; i++) {
          if (comments[i].id === commentId) { comments.splice(i, 1); return true; }
          if (comments[i].replies && remove(comments[i].replies)) {
            comments[i].replies_count = Math.max(0, comments[i].replies_count - 1);
            return true;
          }
        }
        return false;
      };
      remove(this.currentComments);
      this.renderComments(this.currentComments);
    } catch {
      alert('Erro ao deletar comentário');
    }
  }

  updateFormAvatars() {
    const url = Utils.avatarUrl(window.app?.currentUser);
    document.querySelector('.comment-form-avatar')?.setAttribute('src', url);
    document.querySelector('.reply-form-avatar')?.setAttribute('src', url);
  }

  closeComments() {
    document.getElementById('post-comments-modal')?.classList.remove('active');
    this.currentPost = null;
    this.currentComments = [];
  }

  closeReply() {
    document.getElementById('reply-modal')?.classList.remove('active');
    this.replyingTo = null;
  }
}

const commentsManager = new CommentsManager();
window.commentsManager = commentsManager;
