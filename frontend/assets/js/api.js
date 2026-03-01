class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = { 'Content-Type': 'application/json' };
    this.isRefreshingToken = false;
    this.refreshTokenPromise = null;
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: method.toUpperCase(),
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    const token = this.getAccessToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    if (data && method.toLowerCase() !== 'get') {
      if (data instanceof FormData) {
        delete config.headers['Content-Type'];
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    let finalUrl = url;
    if (data && method.toLowerCase() === 'get') {
      const params = new URLSearchParams(data);
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${params}`;
    }

    try {
      const response = await fetch(finalUrl, config);
      const contentType = response.headers.get('content-type');
      const responseData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        if (response.status === 401 && endpoint !== API_CONFIG.ENDPOINTS.REFRESH_TOKEN) {
          const renewed = await this.refreshToken();
          if (renewed) return this.request(method, endpoint, data, options);
          this.handleUnauthorized();
          throw new ApiError('Sessão expirada', 401, responseData);
        }
        throw new ApiError(
          Utils.getErrorMessage(response.status, responseData?.message),
          response.status,
          responseData
        );
      }

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError(APP_CONFIG.ERROR_MESSAGES.NETWORK_ERROR, 0, null);
      }
      throw new ApiError(APP_CONFIG.ERROR_MESSAGES.GENERIC_ERROR, 0, null);
    }
  }

  get(endpoint, params = null, options = {}) { return this.request('GET', endpoint, params, options); }
  post(endpoint, data = null, options = {}) { return this.request('POST', endpoint, data, options); }
  put(endpoint, data = null, options = {}) { return this.request('PUT', endpoint, data, options); }
  patch(endpoint, data = null, options = {}) { return this.request('PATCH', endpoint, data, options); }
  delete(endpoint, options = {}) { return this.request('DELETE', endpoint, null, options); }

  // ─── Token Management ───

  getAccessToken() { return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN); }
  getRefreshToken() { return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN); }

  setTokens(access, refresh) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refresh);
  }

  clearTokens() {
    Object.values(APP_CONFIG.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }

  async refreshToken() {
    if (this.isRefreshingToken) return this.refreshTokenPromise;
    const refresh = this.getRefreshToken();
    if (!refresh) return false;

    this.isRefreshingToken = true;
    this.refreshTokenPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        });
        if (response.ok) {
          const data = await response.json();
          this.setTokens(data.access, data.refresh || refresh);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.isRefreshingToken = false;
      }
    })();

    return this.refreshTokenPromise;
  }

  handleUnauthorized() {
    this.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  isAuthenticated() { return !!this.getAccessToken(); }

  // ─── User Data ───

  setUserData(data) { localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(data)); }

  getUserData() {
    const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  // ─── Auth API ───

  async login(email, password) {
    const response = await this.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password });
    if (response.tokens) {
      this.setTokens(response.tokens.access, response.tokens.refresh);
      this.setUserData(response.user);
    }
    return response;
  }

  async register(userData) {
    const response = await this.post(API_CONFIG.ENDPOINTS.REGISTER, userData);
    if (response.tokens) {
      this.setTokens(response.tokens.access, response.tokens.refresh);
      this.setUserData(response.user);
    }
    return response;
  }

  async logout() {
    this.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // ─── Users API ───

  async getProfile() { return this.get(API_CONFIG.ENDPOINTS.PROFILE); }
  async updateProfile(data) { return this.put(API_CONFIG.ENDPOINTS.PROFILE, data); }
  async getUser(username) { return this.get(`${API_CONFIG.ENDPOINTS.USERS}${username}/`); }
  async followUser(username) { return this.post(API_CONFIG.ENDPOINTS.FOLLOW(username)); }
  async unfollowUser(username) { return this.post(API_CONFIG.ENDPOINTS.UNFOLLOW(username)); }
  async getSuggestedUsers() { return this.get(API_CONFIG.ENDPOINTS.SUGGESTED_USERS); }

  async getFollowing(username) {
    const res = await this.get(API_CONFIG.ENDPOINTS.USER_FOLLOWING(username));
    return res.results || [];
  }

  async getFollowers(username) {
    const res = await this.get(API_CONFIG.ENDPOINTS.USER_FOLLOWERS(username));
    return res.results || [];
  }

  async getUserPosts(username) { return this.get(API_CONFIG.ENDPOINTS.USER_POSTS(username)); }

  // ─── Posts API ───

  async fetchPaginated(endpoint, pageOrUrl = 1) {
    if (typeof pageOrUrl === 'string' && pageOrUrl.startsWith('http')) {
      const response = await fetch(pageOrUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      return response.json();
    }
    return this.get(endpoint, { page: pageOrUrl || 1 });
  }

  async getFeed(pageOrUrl = 1) { return this.fetchPaginated(API_CONFIG.ENDPOINTS.FEED, pageOrUrl); }
  async getExplore(pageOrUrl = 1) { return this.fetchPaginated(API_CONFIG.ENDPOINTS.EXPLORE, pageOrUrl); }

  async createPost(content, image = null) {
    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);
    return this.post(API_CONFIG.ENDPOINTS.POSTS, formData);
  }

  async getPost(id) { return this.get(API_CONFIG.ENDPOINTS.POST_DETAIL(id)); }
  async deletePost(id) { return this.delete(API_CONFIG.ENDPOINTS.POST_DETAIL(id)); }
  async likePost(id) { return this.post(API_CONFIG.ENDPOINTS.POST_LIKE(id)); }
  async dislikePost(id) { return this.post(API_CONFIG.ENDPOINTS.POST_DISLIKE(id)); }
  async repost(id) { return this.post(API_CONFIG.ENDPOINTS.POST_REPOST(id)); }
  async unrepost(id) { return this.delete(API_CONFIG.ENDPOINTS.POST_REPOST(id)); }

  // ─── Comments API ───

  async getPostComments(postId, page = 1) { return this.get(API_CONFIG.ENDPOINTS.POST_COMMENTS(postId), { page }); }

  async createComment(postId, content, parentId = null) {
    return this.post(API_CONFIG.ENDPOINTS.COMMENTS, {
      post: postId,
      content,
      parent_comment: parentId
    });
  }

  async likeComment(id) { return this.post(API_CONFIG.ENDPOINTS.COMMENT_LIKE(id)); }
  async dislikeComment(id) { return this.post(API_CONFIG.ENDPOINTS.COMMENT_DISLIKE(id)); }
  async deleteComment(id) { return this.delete(API_CONFIG.ENDPOINTS.COMMENT_DETAIL(id)); }

  // ─── Notifications API ───

  async getNotifications(page = 1) { return this.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS, { page }); }
  async markNotificationsRead(ids = null) { return this.post(API_CONFIG.ENDPOINTS.MARK_NOTIFICATIONS_READ, { notification_ids: ids }); }
  async searchPosts(query, page = 1) { return this.get(API_CONFIG.ENDPOINTS.SEARCH, { q: query, page }); }
  async getTrending() { return this.get(API_CONFIG.ENDPOINTS.TRENDING); }
  async searchUsers(query) { return this.get(API_CONFIG.ENDPOINTS.USERS, { search: query }); }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const api = new ApiClient();
window.api = api;
window.ApiError = ApiError;
