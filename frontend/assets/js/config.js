const API_CONFIG = {
  BASE_URL: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:8000/api'
    : `${window.location.origin}/api`,
  ENDPOINTS: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    REFRESH_TOKEN: '/token/refresh/',
    PROFILE: '/auth/profile/',
    USERS: '/auth/users/',
    FOLLOW: (u) => `/auth/users/${u}/follow/`,
    UNFOLLOW: (u) => `/auth/users/${u}/unfollow/`,
    SUGGESTED_USERS: '/auth/suggested-users/',
    POSTS: '/social/posts/',
    POST_DETAIL: (id) => `/social/posts/${id}/`,
    POST_LIKE: (id) => `/social/posts/${id}/like/`,
    POST_DISLIKE: (id) => `/social/posts/${id}/dislike/`,
    POST_REPOST: (id) => `/social/posts/${id}/repost/`,
    POST_COMMENTS: (id) => `/social/posts/${id}/comments/`,
    COMMENTS: '/social/comments/',
    COMMENT_DETAIL: (id) => `/social/comments/${id}/`,
    COMMENT_LIKE: (id) => `/social/comments/${id}/like/`,
    COMMENT_DISLIKE: (id) => `/social/comments/${id}/dislike/`,
    FEED: '/social/feed/',
    EXPLORE: '/social/explore/',
    USER_POSTS: (u) => `/social/user-posts/${u}/`,
    USER_FOLLOWING: (u) => `/social/users/${u}/following/`,
    USER_FOLLOWERS: (u) => `/social/users/${u}/followers/`,
    NOTIFICATIONS: '/social/notifications/',
    MARK_NOTIFICATIONS_READ: '/social/notifications/mark-read/',
    SEARCH: '/social/search/',
    TRENDING: '/social/trending/'
  }
};

const APP_CONFIG = {
  APP_NAME: 'TwitterClone',
  VERSION: '1.0.0',
  POSTS_PER_PAGE: 15,
  MAX_POST_LENGTH: 280,
  MAX_BIO_LENGTH: 500,
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  REQUEST_TIMEOUT: 15000,
  LOADING_DELAY: 500,
  NOTIFICATION_CHECK_INTERVAL: 60000,
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'twitterclone_access_token',
    REFRESH_TOKEN: 'twitterclone_refresh_token',
    USER_DATA: 'twitterclone_user_data'
  },
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
    UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
    NOT_FOUND: 'Conteúdo não encontrado.',
    SERVER_ERROR: 'Erro interno do servidor. Tente novamente mais tarde.',
    VALIDATION_ERROR: 'Dados inválidos. Verifique os campos e tente novamente.',
    RATE_LIMIT: 'Muitas tentativas. Aguarde alguns minutos.',
    FILE_TOO_LARGE: 'Arquivo muito grande. Máximo permitido: 10MB.',
    INVALID_FILE_TYPE: 'Tipo de arquivo não permitido. Use apenas imagens.',
    GENERIC_ERROR: 'Algo deu errado. Tente novamente.'
  },
  SUCCESS_MESSAGES: {
    LOGIN: 'Login realizado com sucesso!',
    REGISTER: 'Conta criada com sucesso!',
    POST_CREATED: 'Post publicado com sucesso!',
    POST_DELETED: 'Post removido com sucesso!',
    PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
    FOLLOWED: 'Agora você está seguindo este usuário!',
    UNFOLLOWED: 'Você deixou de seguir este usuário.'
  },
  UI: {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    MOBILE_BREAKPOINT: 768
  }
};

const Utils = {
  formatTimeAgo(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return new Date(dateString).toLocaleDateString('pt-BR');
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  },

  formatPostContent(content) {
    return content
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  },

  getErrorMessage(status, fallback = null) {
    const map = {
      400: APP_CONFIG.ERROR_MESSAGES.VALIDATION_ERROR,
      401: APP_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
      403: APP_CONFIG.ERROR_MESSAGES.FORBIDDEN,
      404: APP_CONFIG.ERROR_MESSAGES.NOT_FOUND,
      429: APP_CONFIG.ERROR_MESSAGES.RATE_LIMIT,
      500: APP_CONFIG.ERROR_MESSAGES.SERVER_ERROR,
      502: APP_CONFIG.ERROR_MESSAGES.SERVER_ERROR,
      503: APP_CONFIG.ERROR_MESSAGES.SERVER_ERROR
    };
    return map[status] || fallback || APP_CONFIG.ERROR_MESSAGES.GENERIC_ERROR;
  },

  avatarUrl(user) {
    return user?.profile_image_url || user?.profile_image || '/static/assets/images/default-avatar.svg';
  },

  fullName(user) {
    return user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
  }
};

window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.Utils = Utils;
