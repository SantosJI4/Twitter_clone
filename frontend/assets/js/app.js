class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'feed';
    this.isInitialized = false;
    this.appReady = false;
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
      return;
    }

    this.hideLoadingScreen();

    if (authManager.isAuthenticated()) {
      try { await this.initializeApp(); }
      catch { authManager.init(); }
    } else {
      const hasRefresh = !!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
      if (hasRefresh) {
        const renewed = await api.refreshToken().catch(() => false);
        if (renewed) await this.initializeApp();
        else authManager.init();
      } else {
        authManager.init();
      }
    }

    this.bindGlobalEvents();
    this.isInitialized = true;
  }

  async initializeApp() {
    if (this.appReady) return;
    try {
      await this.loadCurrentUser();
      this.initNavigation();
      this.bindHamburgerMenus();
      this.initFeatures();
      await this.loadPage('feed');
      authManager.redirectToApp();
      this.appReady = true;
    } catch (error) {
      if (error.status === 401) authManager.handleLogout();
      else alert('Erro ao carregar aplicação. Tente recarregar.');
      throw error;
    }
  }

  async loadCurrentUser() {
    this.currentUser = api.getUserData();
    if (!this.currentUser) {
      this.currentUser = await api.getProfile();
      api.setUserData(this.currentUser);
    }
    this.updateUserUI();
  }

  updateUserUI() {
    if (!this.currentUser) return;

    const sidebar = document.getElementById('sidebar-user');
    if (sidebar) {
      const avatar = sidebar.querySelector('.user-avatar');
      const name = sidebar.querySelector('.user-name');
      const username = sidebar.querySelector('.user-username');
      if (avatar) avatar.src = Utils.avatarUrl(this.currentUser);
      if (name) name.textContent = Utils.fullName(this.currentUser);
      if (username) username.textContent = `@${this.currentUser.username}`;
    }

    const composerAvatar = document.getElementById('composer-avatar');
    if (composerAvatar) composerAvatar.src = Utils.avatarUrl(this.currentUser);
  }

  initNavigation() {
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.navigateTo(item.dataset.page);
      });
    });
  }

  async navigateTo(page) {
    if (this.currentPage === page) return;
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    await this.loadPage(page);
    this.currentPage = page;
  }

  async loadPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`)?.classList.add('active');

    switch (page) {
      case 'feed': if (window.postsManager) await window.postsManager.loadFeed(); break;
      case 'explore': if (window.postsManager) await window.postsManager.loadExplore(); break;
      case 'notifications': await this.loadNotifications(); break;
      case 'profile': await this.loadProfilePage(); break;
    }
  }

  bindHamburgerMenus() {
    const menus = [
      { toggle: 'profile-header-menu-toggle', menu: 'profile-header-nav-menu' },
      { toggle: 'explore-menu-toggle', menu: 'explore-nav-menu' },
      { toggle: 'notifications-menu-toggle', menu: 'notifications-nav-menu' }
    ];

    menus.forEach(({ toggle, menu: menuId }) => {
      const btn = document.getElementById(toggle);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.profile-nav-menu.active').forEach(m => { if (m !== menu) m.classList.remove('active'); });
        menu.classList.toggle('active');
      });

      menu.querySelectorAll('.profile-nav-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          e.preventDefault();
          menu.classList.remove('active');
          await this.navigateTo(item.dataset.page);
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.profile-menu-wrapper')) {
        document.querySelectorAll('.profile-nav-menu.active').forEach(m => m.classList.remove('active'));
      }
    });
  }

  async loadNotifications() {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    try {
      container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Carregando notificações...</p></div>';
      const response = await api.getNotifications();
      const notifications = response.results || response;

      if (!notifications.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><h3>Nenhuma notificação</h3><p>Você não tem notificações no momento.</p></div>';
        return;
      }

      const typeInfo = {
        like: { label: 'Curtiu', icon: 'heart', color: '#E0245E' },
        repost: { label: 'Repostou', icon: 'retweet', color: '#17BF63' },
        comment: { label: 'Comentou', icon: 'comment', color: '#1DA1F2' },
        follow: { label: 'Seguiu', icon: 'user-plus', color: '#1DA1F2' },
        reply: { label: 'Respondeu', icon: 'reply', color: '#1DA1F2' },
        mention: { label: 'Mencionou', icon: 'at', color: '#FF6B35' }
      };
      const defaultType = { label: 'Notificação', icon: 'bell', color: '#1DA1F2' };

      container.innerHTML = notifications.map(n => {
        const type = typeInfo[n.notification_type] || defaultType;
        const sender = n.sender?.full_name || n.sender?.username || 'Usuário';
        const avatar = Utils.avatarUrl(n.sender);
        const unread = !n.is_read;
        return `
          <div class="notification-item ${unread ? 'unread' : 'read'}" data-id="${n.id}">
            <div class="notification-sender-avatar">
              <img src="${avatar}" alt="${sender}" class="avatar">
              <div class="notification-type-badge" style="background:${type.color}"><i class="fas fa-${type.icon}"></i></div>
            </div>
            <div class="notification-main">
              <div class="notification-header">
                <span class="notification-sender"><strong>${sender}</strong></span>
                <span class="notification-type-label">${type.label}</span>
              </div>
              <div class="notification-text">${n.message || 'Nova notificação'}</div>
              <div class="notification-time"><i class="fas fa-clock"></i> ${Utils.formatTimeAgo(n.created_at)}</div>
            </div>
            ${unread ? '<div class="notification-unread-indicator"></div>' : ''}
          </div>`;
      }).join('');

      container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => { item.classList.remove('unread'); item.classList.add('read'); });
      });

      await api.markNotificationsRead();
      this.updateNotificationBadge(0);
    } catch {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro ao carregar</h3><p>Não foi possível carregar as notificações.</p></div>';
    }
  }

  async loadProfilePage() {
    try {
      this.currentUser = await api.getProfile();
    } catch {}
    this.renderOwnProfile();
  }

  renderOwnProfile() {
    const container = document.getElementById('profile-container');
    if (!container || !this.currentUser) return;
    const u = this.currentUser;

    container.innerHTML = `
      <div class="profile-info">
        <div class="profile-header-content">
          <img src="${Utils.avatarUrl(u)}" alt="${Utils.fullName(u)}" class="profile-avatar">
          <div class="profile-details">
            <h1 class="profile-name">${Utils.fullName(u)}</h1>
            <p class="profile-username">@${u.username}</p>
            ${u.bio ? `<p class="profile-bio">${u.bio}</p>` : ''}
            <div class="profile-meta">
              ${u.location ? `<span><i class="fas fa-map-marker-alt"></i> ${u.location}</span>` : ''}
              <span><i class="fas fa-calendar-alt"></i> Membro desde ${Utils.formatDate(u.created_at)}</span>
            </div>
            <div class="profile-stats">
              <a href="#" class="profile-stat" data-tab="following"><span class="stat-count">${u.following_count || 0}</span> <span>Seguindo</span></a>
              <a href="#" class="profile-stat" data-tab="followers"><span class="stat-count">${u.followers_count || 0}</span> <span>Seguidores</span></a>
            </div>
          </div>
        </div>
        <div class="buttons-container">
          <button class="btn btn-secondary" id="edit-profile-btn">Editar Perfil</button>
        </div>
      </div>
      <div class="profile-tabs">
        <button class="profile-tab-btn active" data-tab="posts">Posts</button>
        <button class="profile-tab-btn" data-tab="following">Seguindo</button>
        <button class="profile-tab-btn" data-tab="followers">Seguidores</button>
      </div>
      <div id="profile-content" class="profile-content">
        <div id="posts-content" class="profile-tab-content active"></div>
        <div id="following-content" class="profile-tab-content"></div>
        <div id="followers-content" class="profile-tab-content"></div>
      </div>
      <div id="edit-profile-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Editar Perfil</h2>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <form id="edit-profile-form" class="modal-body">
            <div class="edit-avatar-section">
              <div class="edit-avatar-preview">
                <img src="${Utils.avatarUrl(u)}" alt="Avatar" id="edit-avatar-img" class="edit-avatar-img">
                <label for="edit-profile-image" class="edit-avatar-overlay">
                  <i class="fas fa-camera"></i>
                  <span>Alterar foto</span>
                </label>
                <input type="file" id="edit-profile-image" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none">
              </div>
            </div>
            <div class="form-group"><label for="edit-first-name">Nome</label><input type="text" id="edit-first-name" name="first_name" value="${u.first_name || ''}" required></div>
            <div class="form-group"><label for="edit-last-name">Sobrenome</label><input type="text" id="edit-last-name" name="last_name" value="${u.last_name || ''}" required></div>
            <div class="form-group"><label for="edit-bio">Bio</label><textarea id="edit-bio" name="bio" placeholder="Conte algo sobre você" maxlength="160">${u.bio || ''}</textarea></div>
            <div class="form-group"><label for="edit-location">Localização</label><input type="text" id="edit-location" name="location" value="${u.location || ''}" placeholder="Sua localização"></div>
            <div class="form-group"><label for="edit-website">Website</label><input type="url" id="edit-website" name="website" value="${u.website || ''}" placeholder="https://seu-site.com"></div>
            <div class="form-actions">
              <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
          </form>
          <div class="modal-divider"></div>
          <div class="modal-body">
            <h3 class="modal-section-title"><i class="fas fa-lock"></i> Alterar Senha</h3>
            <form id="change-password-form">
              <div class="form-group"><label for="old-password">Senha atual</label><input type="password" id="old-password" name="old_password" required placeholder="Sua senha atual"></div>
              <div class="form-group"><label for="new-password">Nova senha</label><input type="password" id="new-password" name="new_password" required placeholder="Mínimo 8 caracteres" minlength="8"></div>
              <div class="form-group"><label for="new-password-confirm">Confirmar nova senha</label><input type="password" id="new-password-confirm" name="new_password_confirm" required placeholder="Confirme a nova senha"></div>
              <div id="password-feedback" class="form-feedback"></div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Alterar Senha</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    this.bindProfileTabEvents();
    this.bindEditProfileEvents();
    this.loadProfilePosts();
  }

  bindEditProfileEvents() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    document.getElementById('edit-profile-btn')?.addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('modal-close-btn')?.addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    // Profile image preview
    this._selectedProfileImage = null;
    document.getElementById('edit-profile-image')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. Máximo 5MB.');
        e.target.value = '';
        return;
      }
      this._selectedProfileImage = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById('edit-avatar-img');
        if (img) img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Edit profile form
    document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Salvando...';
      try {
        const formData = new FormData();
        formData.append('first_name', document.getElementById('edit-first-name').value);
        formData.append('last_name', document.getElementById('edit-last-name').value);
        formData.append('bio', document.getElementById('edit-bio').value);
        formData.append('location', document.getElementById('edit-location').value);
        formData.append('website', document.getElementById('edit-website').value);
        if (this._selectedProfileImage) {
          formData.append('profile_image', this._selectedProfileImage);
        }
        const response = await api.updateProfile(formData);
        this.currentUser = response.user || { ...this.currentUser, ...response };
        api.setUserData(this.currentUser);
        this._selectedProfileImage = null;
        modal.classList.remove('active');
        this.renderOwnProfile();
        this.updateUserUI();
      } catch (err) {
        alert('Erro ao atualizar perfil.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    });

    // Change password form
    document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('password-feedback');
      const btn = e.target.querySelector('button[type="submit"]');
      const newPass = document.getElementById('new-password').value;
      const confirmPass = document.getElementById('new-password-confirm').value;

      if (newPass !== confirmPass) {
        feedback.textContent = 'As senhas não coincidem.';
        feedback.className = 'form-feedback error';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Alterando...';
      feedback.textContent = '';
      feedback.className = 'form-feedback';

      try {
        await api.changePassword({
          old_password: document.getElementById('old-password').value,
          new_password: newPass,
          new_password_confirm: confirmPass
        });
        feedback.textContent = 'Senha alterada com sucesso!';
        feedback.className = 'form-feedback success';
        e.target.reset();
      } catch (err) {
        const msg = err?.data?.old_password?.[0] || err?.data?.new_password?.[0] || err?.message || 'Erro ao alterar senha.';
        feedback.textContent = msg;
        feedback.className = 'form-feedback error';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Alterar Senha';
      }
    });
  }

  bindProfileTabEvents() {
    const tabs = document.querySelectorAll('.profile-tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById(`${btn.dataset.tab}-content`);
        if (content) {
          content.classList.add('active');
          if (!content.innerHTML.trim()) {
            if (btn.dataset.tab === 'following') await this.loadFollowing();
            else if (btn.dataset.tab === 'followers') await this.loadFollowers();
          }
        }
      });
    });

    document.querySelectorAll('.profile-stat').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector(`.profile-tab-btn[data-tab="${link.dataset.tab}"]`)?.click();
      });
    });
  }

  async loadProfilePosts() {
    const container = document.getElementById('posts-content');
    if (!container) return;

    try {
      container.innerHTML = '<div class="loading-posts"><div class="spinner"></div></div>';
      const response = await api.getUserPosts(this.currentUser.username);
      const posts = response.results || (Array.isArray(response) ? response : []);

      if (!posts.length) {
        container.innerHTML = '<div class="profile-empty"><p>Nenhum post ainda</p></div>';
        return;
      }

      container.innerHTML = posts.map(post => `
        <div class="post" data-post-id="${post.id}">
          <div class="post-header">
            <img src="${Utils.avatarUrl(post.author)}" alt="${Utils.fullName(post.author)}" class="post-avatar">
            <div class="post-header-info">
              <span class="post-author">${Utils.fullName(post.author)}</span>
              <span class="post-username">@${post.author.username}</span>
              <span class="post-time">${Utils.formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
          <div class="post-content">${post.content}</div>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
          <div class="post-actions">
            <button class="post-action comment-btn" data-post-id="${post.id}"><i class="far fa-comment"></i><span>${post.comments_count || 0}</span></button>
            <button class="post-action repost-btn" data-post-id="${post.id}"><i class="fas fa-retweet"></i><span>${post.reposts_count || 0}</span></button>
            <button class="post-action like-btn ${post.is_liked ? 'active' : ''}" data-post-id="${post.id}"><i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i><span>${post.likes_count || 0}</span></button>
          </div>
        </div>`).join('');

      this.bindProfilePostEvents(container);
    } catch {
      container.innerHTML = '<div class="profile-empty"><p>Erro ao carregar posts</p></div>';
    }
  }

  bindProfilePostEvents(container) {
    container.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.commentsManager) window.commentsManager.openCommentsModal(btn.dataset.postId);
      });
    });

    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isActive = btn.classList.contains('active');
        try {
          if (isActive) {
            await api.dislikePost(btn.dataset.postId);
            btn.classList.remove('active');
            btn.querySelector('i').className = 'far fa-heart';
          } else {
            await api.likePost(btn.dataset.postId);
            btn.classList.add('active');
            btn.querySelector('i').className = 'fas fa-heart';
          }
          const span = btn.querySelector('span');
          span.textContent = parseInt(span.textContent) + (isActive ? -1 : 1);
        } catch {}
      });
    });

    container.querySelectorAll('.repost-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api.repost(btn.dataset.postId);
          btn.classList.add('active');
        } catch {}
      });
    });
  }

  renderUserList(users, container, emptyMsg) {
    if (!users.length) {
      container.innerHTML = `<div class="profile-empty"><p>${emptyMsg}</p></div>`;
      return;
    }
    container.innerHTML = `<div class="profile-users-list">${users.map(u => `
      <div class="profile-user-item">
        <img src="${Utils.avatarUrl(u)}" alt="${Utils.fullName(u)}" class="profile-user-avatar">
        <div class="profile-user-info">
          <div class="profile-user-name">${Utils.fullName(u)}</div>
          <div class="profile-user-username">@${u.username}</div>
        </div>
        <button class="follow-btn ${u.is_following ? 'following-btn' : ''}" data-username="${u.username}">
          ${u.is_following ? 'Seguindo' : 'Seguir'}
        </button>
      </div>`).join('')}</div>`;

    container.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); this.followUser(btn.dataset.username, btn); });
    });
  }

  async loadFollowing() {
    const container = document.getElementById('following-content');
    if (!container) return;
    try {
      container.innerHTML = '<div class="loading-posts"><div class="spinner"></div></div>';
      const users = await api.getFollowing(this.currentUser.username);
      this.renderUserList(users, container, 'Não segue ninguém');
    } catch {
      container.innerHTML = '<div class="profile-empty"><p>Erro ao carregar</p></div>';
    }
  }

  async loadFollowers() {
    const container = document.getElementById('followers-content');
    if (!container) return;
    try {
      container.innerHTML = '<div class="loading-posts"><div class="spinner"></div></div>';
      const users = await api.getFollowers(this.currentUser.username);
      this.renderUserList(users, container, 'Nenhum seguidor ainda');
    } catch {
      container.innerHTML = '<div class="profile-empty"><p>Erro ao carregar</p></div>';
    }
  }

  initFeatures() {
    if (window.PostsManager && !window.postsManager) {
      window.postsManager = new window.PostsManager();
    }
    try { this.initLogout(); } catch(e) { console.error('initLogout:', e); }
    try { this.initSearch(); } catch(e) { console.error('initSearch:', e); }
    this.loadSuggestedUsers().catch(e => console.error('loadSuggestedUsers:', e));
    this.loadTrending().catch(e => console.error('loadTrending:', e));
    this.startNotificationCheck();
  }

  initLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Tem certeza que deseja sair?')) await authManager.handleLogout();
    });
  }

  async loadSuggestedUsers() {
    const container = document.getElementById('suggested-users');
    if (!container) return;

    try {
      const users = await api.getSuggestedUsers();
      if (!users.length) {
        container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-secondary);font-size:13.5px">Nenhuma sugestão no momento.</div>';
        return;
      }

      container.innerHTML = users.slice(0, 5).map(u => `
        <div class="user-suggestion" data-username="${u.username}">
          <img src="${Utils.avatarUrl(u)}" alt="${Utils.fullName(u)}" class="user-avatar">
          <div class="suggestion-info">
            <div class="suggestion-name">${Utils.fullName(u)}</div>
            <div class="suggestion-username">@${u.username}</div>
          </div>
          <button class="follow-btn" data-username="${u.username}">Seguir</button>
        </div>`).join('');

      container.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.followUser(btn.dataset.username, btn); });
      });
    } catch {
      container.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-secondary);font-size:13.5px">Erro ao carregar sugestões.</div>';
    }
  }

  initSearch() {
    const input = document.getElementById('explore-search-input');
    const clearBtn = document.getElementById('explore-search-clear');
    const form = document.getElementById('explore-search-form');
    if (!input || !form) return;

    this.searchDebounce = null;
    this.searchTab = 'posts';

    form.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); return false; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (q) this.performSearch(q);
      }
    });

    input.addEventListener('input', () => {
      const q = input.value.trim();
      clearBtn.style.display = q ? 'flex' : 'none';

      clearTimeout(this.searchDebounce);
      if (!q) {
        document.getElementById('search-results-tabs').style.display = 'none';
        if (window.postsManager) window.postsManager.loadExplore();
        return;
      }

      this.searchDebounce = setTimeout(() => this.performSearch(q), 400);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      document.getElementById('search-results-tabs').style.display = 'none';
      if (window.postsManager) window.postsManager.loadExplore();
    });

    document.querySelectorAll('.search-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.searchTab = tab.dataset.tab;
        const q = input.value.trim();
        if (q) this.performSearch(q);
      });
    });
  }

  async performSearch(query) {
    const container = document.getElementById('explore-posts');
    if (!container) return;

    document.getElementById('search-results-tabs').style.display = 'flex';
    container.innerHTML = '<div class="loading-posts"><div class="spinner"></div><p>Buscando...</p></div>';

    try {
      if (this.searchTab === 'posts') {
        const response = await api.searchPosts(query);
        const posts = response.results || [];
        if (!posts.length) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Nenhum resultado</h3><p>Nenhum post encontrado para "${query}"</p></div>`;
          return;
        }
        container.innerHTML = posts.map(p => window.postsManager.postHTML(p)).join('');
        window.postsManager.bindPostEvents(container);
      } else {
        const response = await api.searchUsers(query);
        const users = response.results || response;
        if (!users.length) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-user"></i><h3>Nenhum usu\u00e1rio</h3><p>Nenhum usu\u00e1rio encontrado para "${query}"</p></div>`;
          return;
        }
        container.innerHTML = users.map(u => `
          <div class="search-user-item" data-username="${u.username}">
            <img src="${Utils.avatarUrl(u)}" alt="${Utils.fullName(u)}" class="user-avatar user-avatar-link" data-username="${u.username}">
            <div class="search-user-info">
              <div class="user-name user-link" data-username="${u.username}">${Utils.fullName(u)}</div>
              <div class="user-username">@${u.username}</div>
              ${u.bio ? `<div class="user-bio-preview" style="font-size:0.82rem;color:var(--text-secondary);margin-top:2px">${u.bio.substring(0, 80)}${u.bio.length > 80 ? '...' : ''}</div>` : ''}
            </div>
            <button class="follow-btn" data-username="${u.username}">Seguir</button>
          </div>`).join('');

        container.querySelectorAll('.follow-btn').forEach(btn => {
          btn.addEventListener('click', (e) => { e.stopPropagation(); this.followUser(btn.dataset.username, btn); });
        });
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro na busca</h3><p>Tente novamente.</p></div>';
    }
  }

  async loadTrending() {
    const container = document.getElementById('trending-topics');
    if (!container) return;

    try {
      const trending = await api.getTrending();
      if (!Array.isArray(trending) || !trending.length) {
        container.innerHTML = '<div class="trending-empty"><i class="fas fa-hashtag" style="font-size:1.5rem;margin-bottom:0.5rem;color:var(--text-tertiary)"></i><p>Nenhuma hashtag em alta no momento</p></div>';
        return;
      }

      container.innerHTML = trending.map((item, i) => `
        <div class="trending-item" data-hashtag="${item.hashtag}">
          <div class="trending-info">
            <div class="trending-category">Trending · #${i + 1}</div>
            <div class="trending-hashtag">${item.hashtag}</div>
            <div class="trending-count">${item.count} ${item.count === 1 ? 'post' : 'posts'}</div>
          </div>
        </div>`).join('');

      container.querySelectorAll('.trending-item').forEach(item => {
        item.addEventListener('click', () => {
          const hashtag = item.dataset.hashtag;
          this.navigateTo('explore');
          setTimeout(() => {
            const input = document.getElementById('explore-search-input');
            if (input) {
              input.value = hashtag;
              input.dispatchEvent(new Event('input'));
            }
          }, 100);
        });
      });
    } catch {
      container.innerHTML = '<div class="trending-empty">Erro ao carregar trending</div>';
    }
  }

  async followUser(username, button) {
    try {
      button.disabled = true;
      button.textContent = 'Seguindo...';
      await api.followUser(username);
      button.textContent = 'Seguindo';
      button.classList.add('following-btn');
      button.disabled = false;

      try { this.currentUser = await api.getProfile(); } catch {}

      button.addEventListener('mouseenter', () => { if (button.classList.contains('following-btn')) button.textContent = 'Deixar de seguir'; });
      button.addEventListener('mouseleave', () => { if (button.classList.contains('following-btn')) button.textContent = 'Seguindo'; });
    } catch {
      button.disabled = false;
      button.textContent = 'Seguir';
    }
  }

  startNotificationCheck() {
    setInterval(async () => {
      try {
        const response = await api.getNotifications(1);
        const unread = response.results?.filter(n => !n.is_read).length || 0;
        this.updateNotificationBadge(unread);
      } catch {}
    }, APP_CONFIG.NOTIFICATION_CHECK_INTERVAL);
  }

  updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'block' : 'none'; }
  }

  bindGlobalEvents() {
    window.addEventListener('auth:success', () => this.initializeApp());
    window.addEventListener('auth:logout:complete', () => this.reset());
    this.initScrollToTop();
  }

  initScrollToTop() {
    const btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 500));
  }

  reset() {
    this.currentUser = null;
    this.currentPage = 'feed';
    this.appReady = false;
    this.updateNotificationBadge(0);
  }

  hideLoadingScreen() {
    const el = document.getElementById('loading-screen');
    if (el) setTimeout(() => el.style.display = 'none', APP_CONFIG.LOADING_DELAY);
  }
}

const app = new App();
window.app = app;
