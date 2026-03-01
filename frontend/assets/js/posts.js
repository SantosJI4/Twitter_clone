class PostsManager {
  constructor() {
    this.currentFeed = 'feed';
    this.loadedPosts = new Set();
    this.isLoading = false;
    this.nextPage = null;
    this.scrollBound = false;
    this.init();
  }

  init() {
    this.initComposer();
    this.setupInfiniteScroll();
  }

  initComposer() {
    const form = document.getElementById('compose-form');
    const input = document.getElementById('compose-input');
    const btn = document.getElementById('compose-btn');
    const counter = document.getElementById('character-count');
    if (!form || !input || !btn) return;

    input.addEventListener('input', () => {
      const len = input.value.length;
      if (counter) {
        counter.textContent = `${len}/280`;
        counter.style.color = len > 280 ? '#dc2626' : len > 250 ? '#f59e0b' : '#9ca3af';
      }
      btn.disabled = len === 0 || len > 280;
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createPost();
    });

    document.getElementById('image-upload')?.addEventListener('change', (e) => this.handleImageUpload(e));
  }

  async createPost() {
    const input = document.getElementById('compose-input');
    const btn = document.getElementById('compose-btn');
    const upload = document.getElementById('image-upload');
    const content = input.value.trim();
    if (!content || content.length > 280) return;

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
      const post = await api.createPost(content, upload.files[0] || null);
      input.value = '';
      upload.value = '';
      const preview = document.getElementById('image-preview');
      if (preview) preview.innerHTML = '';
      input.style.height = 'auto';
      document.getElementById('character-count').textContent = '0/280';
      this.prependPost(post);
      this.showToast('Post publicado com sucesso!', 'success');
    } catch {
      this.showToast('Erro ao publicar post.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Postar';
    }
  }

  async loadFeed() {
    this.currentFeed = 'feed';
    await this.loadPosts('feed-posts', api.getFeed.bind(api), true);
  }

  async loadExplore() {
    this.currentFeed = 'explore';
    await this.loadPosts('explore-posts', api.getExplore.bind(api), true);
  }

  async loadPosts(containerId, apiCall, refresh = false) {
    if (this.isLoading) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      this.isLoading = true;
      if (refresh) {
        this.loadedPosts.clear();
        this.nextPage = null;
        container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Carregando posts...</p></div>';
      }

      const response = await apiCall(this.nextPage);
      const posts = response.results || response;
      if (refresh) container.innerHTML = '';

      if (!posts.length && refresh) {
        container.innerHTML = this.getEmptyHTML();
        return;
      }

      const newPosts = posts.filter(p => !this.loadedPosts.has(p.id));
      newPosts.forEach(p => this.loadedPosts.add(p.id));

      const html = newPosts.map(p => this.postHTML(p)).join('');
      if (refresh) container.innerHTML = html;
      else container.insertAdjacentHTML('beforeend', html);

      this.nextPage = response.next;
      this.bindPostEvents(container);
    } catch {
      if (refresh) container.innerHTML = this.getErrorHTML();
    } finally {
      this.isLoading = false;
    }
  }

  postHTML(post) {
    const user = post.author;
    const canEdit = user?.id === window.app?.currentUser?.id;

    return `
      <article class="post" data-post-id="${post.id}">
        ${post.is_repost ? `<div class="repost-header"><i class="fas fa-retweet"></i><span>${Utils.fullName(user)} repostou</span></div>` : ''}
        <div class="post-header">
          <img src="${Utils.avatarUrl(user)}" alt="${Utils.fullName(user)}" class="user-avatar user-avatar-link" data-username="${user.username}">
          <div class="post-user-info">
            <span class="user-name">${Utils.fullName(user)}</span>
            <a href="javascript:void(0)" class="user-username user-link" data-username="${user.username}">@${user.username}</a>
            <span class="post-date">${Utils.formatTimeAgo(post.created_at)}</span>
          </div>
          ${canEdit ? `
            <div class="post-menu">
              <button class="post-menu-btn"><i class="fas fa-ellipsis-h"></i></button>
              <div class="post-menu-dropdown">
                <button class="menu-item delete" data-action="delete"><i class="fas fa-trash"></i> Excluir</button>
              </div>
            </div>` : ''}
        </div>
        <div class="post-content">
          <p>${Utils.formatPostContent(post.content)}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        </div>
        ${post.original_post ? this.originalPostHTML(post.original_post) : ''}
        <div class="post-actions">
          <button class="post-action comment-btn" data-action="comment"><i class="far fa-comment"></i><span>${post.comments_count || 0}</span></button>
          <button class="post-action repost-btn ${post.is_repost ? 'active' : ''}" data-action="repost"><i class="fas fa-retweet"></i><span>${post.reposts_count || 0}</span></button>
          <button class="post-action like-btn ${post.is_liked ? 'active' : ''}" data-action="like"><i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i><span>${post.likes_count || 0}</span></button>
        </div>
      </article>`;
  }

  originalPostHTML(post) {
    const user = post.author;
    return `
      <div class="original-post">
        <div class="post-header">
          <img src="${Utils.avatarUrl(user)}" alt="${Utils.fullName(user)}" class="user-avatar user-avatar-link" data-username="${user.username}">
          <div class="post-user-info">
            <span class="user-name">${Utils.fullName(user)}</span>
            <a href="javascript:void(0)" class="user-username user-link" data-username="${user.username}">@${user.username}</a>
            <span class="post-date">${Utils.formatTimeAgo(post.created_at)}</span>
          </div>
        </div>
        <div class="post-content">
          <p>${Utils.formatPostContent(post.content)}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        </div>
      </div>`;
  }

  bindPostEvents(container) {
    container.querySelectorAll('.post-action').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const postId = btn.closest('.post').dataset.postId;
        await this.handleAction(btn.dataset.action, postId, btn);
      });
    });

    container.querySelectorAll('.post-menu-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.nextElementSibling.classList.toggle('active');
      });
    });

    container.querySelectorAll('.menu-item[data-action="delete"]').forEach(item => {
      if (item.dataset.bound) return;
      item.dataset.bound = 'true';
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        const postEl = item.closest('.post');
        if (confirm('Tem certeza que deseja excluir este post?')) {
          try {
            await api.deletePost(postEl.dataset.postId);
            postEl.remove();
            this.showToast('Post excluído!', 'success');
          } catch {
            this.showToast('Erro ao excluir post.', 'error');
          }
        }
      });
    });

    container.querySelectorAll('.post-image').forEach(img => {
      if (img.dataset.bound) return;
      img.dataset.bound = 'true';
      img.addEventListener('click', () => this.openImageModal(img.src));
    });
  }

  async handleAction(action, postId, btn) {
    try {
      switch (action) {
        case 'like': await this.toggleLike(postId, btn); break;
        case 'repost': await this.toggleRepost(postId, btn); break;
        case 'comment':
          if (window.commentsManager) window.commentsManager.openCommentsModal(postId);
          break;
      }
    } catch {
      this.showToast('Erro ao executar ação.', 'error');
    }
  }

  async toggleLike(postId, btn) {
    const isLiked = btn.classList.contains('active');
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    btn.disabled = true;

    try {
      if (isLiked) {
        await api.dislikePost(postId);
        btn.classList.remove('active');
        icon.className = 'far fa-heart';
        span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        await api.likePost(postId);
        btn.classList.add('active');
        icon.className = 'fas fa-heart';
        span.textContent = parseInt(span.textContent) + 1;
      }
    } finally {
      btn.disabled = false;
    }
  }

  async toggleRepost(postId, btn) {
    const isReposted = btn.classList.contains('active');
    const span = btn.querySelector('span');

    if (isReposted) {
      if (!confirm('Deseja desfazer o repost?')) return;
      await api.unrepost(postId);
      btn.classList.remove('active');
      span.textContent = Math.max(0, parseInt(span.textContent) - 1);
    } else {
      await api.repost(postId);
      btn.classList.add('active');
      span.textContent = parseInt(span.textContent) + 1;
      this.showToast('Post repostado!', 'success');
    }
  }

  prependPost(post) {
    const container = document.getElementById('feed-posts');
    if (!container) return;
    if (container.querySelector('.empty-state')) container.innerHTML = '';
    container.insertAdjacentHTML('afterbegin', this.postHTML(post));
    this.bindPostEvents(container);
    this.loadedPosts.add(post.id);
  }

  setupInfiniteScroll() {
    if (this.scrollBound) return;
    this.scrollBound = true;
    window.addEventListener('scroll', () => {
      if (this.isLoading || !this.nextPage) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 1000) this.loadMorePosts();
    });
  }

  async loadMorePosts() {
    if (!this.nextPage) return;
    const containerId = this.currentFeed === 'explore' ? 'explore-posts' : 'feed-posts';
    const apiCall = () => this.currentFeed === 'explore'
      ? api.getExplore(this.nextPage) : api.getFeed(this.nextPage);
    await this.loadPosts(containerId, apiCall, false);
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = APP_CONFIG.ALLOWED_IMAGE_TYPES;
    if (!allowed.includes(file.type)) {
      this.showToast('Formato não suportado. Use JPG, PNG, GIF ou WebP.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > APP_CONFIG.MAX_IMAGE_SIZE) {
      this.showToast(`Imagem muito grande. Máximo: ${APP_CONFIG.MAX_IMAGE_SIZE / (1024 * 1024)}MB`, 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('image-preview');
      if (preview) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        preview.innerHTML = `
          <div class="image-preview-item">
            <img src="${ev.target.result}" alt="Preview">
            <button type="button" class="image-preview-remove" onclick="this.closest('.image-preview').innerHTML=''; document.getElementById('image-upload').value='';">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="image-upload-info">
            <i class="fas fa-image"></i>
            <span>${file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}</span>
            <span>·</span>
            <span>${sizeMB}MB</span>
          </div>`;
      }
    };
    reader.readAsDataURL(file);
  }

  openImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `<div class="modal-overlay active"><div class="modal-content"><button class="modal-close">&times;</button><img src="${src}" alt="Imagem expandida"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close') || e.target.classList.contains('modal-overlay')) modal.remove();
    });
  }

  getEmptyHTML() {
    const msg = this.currentFeed === 'explore'
      ? { icon: 'fas fa-search', title: 'Explore novos posts', text: 'Descubra o que está acontecendo.' }
      : { icon: 'fas fa-stream', title: 'Bem-vindo ao seu feed!', text: 'Siga pessoas para ver seus posts aqui.' };
    return `<div class="empty-state"><i class="${msg.icon}"></i><h3>${msg.title}</h3><p>${msg.text}</p></div>`;
  }

  getErrorHTML() {
    return `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro ao carregar posts</h3><p>Tente recarregar a página.</p><button class="btn btn-primary" onclick="location.reload()">Recarregar</button></div>`;
  }

  showToast(message, type = 'info') {
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerHTML = `<i class="fas fa-${icons[type]}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
  }
}

window.PostsManager = PostsManager;
