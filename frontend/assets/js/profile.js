class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('user-profile-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    document.addEventListener('click', (e) => {
      const followBtn = e.target.closest('#follow-user-btn');
      if (followBtn) return this.toggleFollow();

      if (e.target.classList.contains('user-link') || e.target.classList.contains('user-avatar-link')) {
        e.preventDefault();
        e.stopPropagation();
        const username = e.target.dataset.username;
        if (username) this.openProfile(username);
      }
    });
  }

  async openProfile(username) {
    try {
      const user = await api.getUser(username);
      this.currentUser = user;
      this.renderModal(user);
      const modal = document.getElementById('user-profile-modal');
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    } catch {
      alert('Erro ao carregar perfil do usuário');
    }
  }

  renderModal(user) {
    const container = document.querySelector('.profile-modal-content');
    if (!container) return;

    const isOwn = window.app?.currentUser?.id === user.id;

    container.innerHTML = `
      <div class="profile-header">
        <button id="close-profile-modal" class="close-profile-btn"><span>✕</span></button>
        <div class="profile-cover"></div>
      </div>
      <div class="profile-body">
        <div class="profile-avatar-section">
          <img src="${Utils.avatarUrl(user)}" alt="${Utils.fullName(user)}" class="profile-avatar-large">
          ${!isOwn ? `
            <button id="follow-user-btn" class="follow-btn ${user.is_following ? 'following' : ''}">
              ${user.is_following ? '✓ Seguindo' : '+ Seguir'}
            </button>` : ''}
        </div>
        <div class="profile-info">
          <div class="profile-names">
            <h2 class="profile-name">${Utils.fullName(user)}</h2>
            <a href="javascript:void(0)" class="profile-username">@${user.username}</a>
          </div>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          <div class="profile-meta">
            ${user.location ? `<span class="meta-item">📍 ${user.location}</span>` : ''}
            ${user.website ? `<span class="meta-item"><a href="${user.website}" target="_blank" rel="noopener">🔗 ${new URL(user.website).hostname}</a></span>` : ''}
            ${user.created_at ? `<span class="meta-item">📅 Membro desde ${Utils.formatDate(user.created_at)}</span>` : ''}
          </div>
          <div class="profile-stats">
            <div class="stat"><span class="stat-number">${user.following_count || 0}</span><span class="stat-label">Seguindo</span></div>
            <div class="stat"><span class="stat-number">${user.followers_count || 0}</span><span class="stat-label">Seguidores</span></div>
          </div>
        </div>
      </div>
      <div class="profile-tabs">
        <button class="tab-btn active" data-tab="posts">Posts</button>
        <button class="tab-btn" data-tab="following">Seguindo</button>
        <button class="tab-btn" data-tab="followers">Seguidores</button>
      </div>
      <div class="profile-content">
        <div id="posts-tab" class="tab-content active"><div class="posts-list"></div></div>
        <div id="following-tab" class="tab-content"><div class="following-list"></div></div>
        <div id="followers-tab" class="tab-content"><div class="followers-list"></div></div>
      </div>`;

    this.bindModalEvents();
    this.loadUserPosts();
  }

  bindModalEvents() {
    document.getElementById('close-profile-modal')?.addEventListener('click', () => this.closeModal());

    document.querySelectorAll('.profile-modal-content .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-modal-content .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.profile-modal-content .tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`${btn.dataset.tab}-tab`)?.classList.add('active');

        if (btn.dataset.tab === 'following') this.loadFollowing();
        else if (btn.dataset.tab === 'followers') this.loadFollowers();
      });
    });
  }

  async loadUserPosts() {
    try {
      const data = await api.getUserPosts(this.currentUser.username);
      const posts = data.results || data;
      const list = document.querySelector('.profile-modal-content .posts-list');
      if (!list) return;

      if (!posts?.length) {
        list.innerHTML = '<p class="empty-state">Nenhum post ainda</p>';
        return;
      }

      list.innerHTML = posts.map(post => `
        <div class="post-card-mini" data-post-id="${post.id}">
          <div class="post-content-mini">${(post.content || '').substring(0, 100)}${post.content?.length > 100 ? '...' : ''}</div>
          <div class="post-stats-mini">
            <span>💬 ${post.comments_count || 0}</span>
            <span>❤️ ${post.likes_count || 0}</span>
            <span>🔁 ${post.reposts_count || 0}</span>
          </div>
        </div>`).join('');
    } catch {
      const list = document.querySelector('.profile-modal-content .posts-list');
      if (list) list.innerHTML = '<p class="empty-state">Erro ao carregar posts</p>';
    }
  }

  renderUserList(users, container) {
    if (!users?.length) {
      container.innerHTML = '<div class="profile-empty">Nenhum usuário encontrado</div>';
      return;
    }
    container.innerHTML = users.map(user => `
      <div class="profile-user-item">
        <div class="profile-user-info">
          <img src="${Utils.avatarUrl(user)}" alt="${Utils.fullName(user)}" class="profile-user-avatar" data-username="${user.username}">
          <div class="profile-user-details">
            <div class="profile-user-name" data-username="${user.username}" style="cursor:pointer">${Utils.fullName(user)}</div>
            <div class="profile-user-username">@${user.username}</div>
          </div>
        </div>
      </div>`).join('');
  }

  async loadFollowing() {
    const list = document.querySelector('.profile-modal-content .following-list');
    if (!list) return;
    try {
      const users = await api.getFollowing(this.currentUser.username);
      this.renderUserList(users, list);
    } catch {
      list.innerHTML = '<div class="profile-empty">Erro ao carregar</div>';
    }
  }

  async loadFollowers() {
    const list = document.querySelector('.profile-modal-content .followers-list');
    if (!list) return;
    try {
      const users = await api.getFollowers(this.currentUser.username);
      this.renderUserList(users, list);
    } catch {
      list.innerHTML = '<div class="profile-empty">Erro ao carregar</div>';
    }
  }

  async toggleFollow() {
    if (!this.currentUser) return;
    const btn = document.getElementById('follow-user-btn');
    const isFollowing = btn.classList.contains('following');

    try {
      if (isFollowing) {
        await api.unfollowUser(this.currentUser.username);
        btn.classList.remove('following');
        btn.innerHTML = '+ Seguir';
      } else {
        await api.followUser(this.currentUser.username);
        btn.classList.add('following');
        btn.innerHTML = '✓ Seguindo';
      }
      this.currentUser.is_following = !isFollowing;
    } catch {
      alert('Erro ao atualizar seguimento');
    }
  }

  closeModal() {
    document.getElementById('user-profile-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.profileManager = new ProfileManager();
