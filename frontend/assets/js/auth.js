class AuthManager {
  constructor() {
    this.isLoading = false;
    this.bindEvents();
    this.initPasswordToggles();
  }

  bindEvents() {
    document.getElementById('login-submit')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-submit')?.addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('show-register')?.addEventListener('click', (e) => { e.preventDefault(); this.showForm('register'); });
    document.getElementById('show-login')?.addEventListener('click', (e) => { e.preventDefault(); this.showForm('login'); });
    window.addEventListener('auth:logout', () => this.handleLogout());
  }

  initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    if (this.isLoading) return;

    const form = e.target;
    const fd = new FormData(form);
    const email = fd.get('email');
    const password = fd.get('password');

    if (!this.validateLogin(email, password)) return;

    this.setLoading(form, true);
    this.clearErrors();

    try {
      const response = await api.login(email, password);
      this.showSuccess(response.message || APP_CONFIG.SUCCESS_MESSAGES.LOGIN);
      setTimeout(() => this.redirectToApp(), 1000);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(form, false);
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    if (this.isLoading) return;

    const form = e.target;
    const fd = new FormData(form);
    const userData = {
      first_name: fd.get('first_name'),
      last_name: fd.get('last_name'),
      username: fd.get('username'),
      email: fd.get('email'),
      password: fd.get('password'),
      password_confirm: fd.get('password_confirm')
    };

    if (!this.validateRegister(userData)) return;

    this.setLoading(form, true);
    this.clearErrors();

    try {
      const response = await api.register(userData);
      this.showSuccess(response.message || APP_CONFIG.SUCCESS_MESSAGES.REGISTER);
      setTimeout(() => this.redirectToApp(), 1000);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(form, false);
    }
  }

  validateLogin(email, password) {
    const errors = [];
    if (!email?.trim()) errors.push('Email é obrigatório.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email inválido.');
    if (!password?.trim()) errors.push('Senha é obrigatória.');
    if (errors.length) { this.showErrors(errors, 'login-errors'); return false; }
    return true;
  }

  validateRegister(d) {
    const errors = [];
    if (!d.first_name?.trim()) errors.push('Nome é obrigatório.');
    if (!d.last_name?.trim()) errors.push('Sobrenome é obrigatório.');
    if (!d.username?.trim()) errors.push('Nome de usuário é obrigatório.');
    else if (d.username.length < 3) errors.push('Nome de usuário deve ter pelo menos 3 caracteres.');
    else if (!/^[a-zA-Z0-9_]+$/.test(d.username)) errors.push('Apenas letras, números e underscore.');
    if (!d.email?.trim()) errors.push('Email é obrigatório.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.push('Email inválido.');
    if (!d.password?.trim()) errors.push('Senha é obrigatória.');
    else if (d.password.length < 8) errors.push('Senha deve ter pelo menos 8 caracteres.');
    if (d.password !== d.password_confirm) errors.push('Confirmação de senha não confere.');
    if (errors.length) { this.showErrors(errors, 'register-errors'); return false; }
    return true;
  }

  showForm(type) {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    if (!login || !register) return;
    const [hide, show] = type === 'register' ? [login, register] : [register, login];
    hide.classList.remove('active');
    setTimeout(() => show.classList.add('active'), 300);
    this.clearErrors();
  }

  setLoading(form, loading) {
    this.isLoading = loading;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = loading;
      btn.classList.toggle('btn-loading', loading);
    }
    form.querySelectorAll('input').forEach(input => { input.disabled = loading; });
  }

  showErrors(errors, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array.isArray(errors)
      ? (errors.length === 1 ? errors[0] : '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>')
      : errors;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 8000);
  }

  showSuccess(message) {
    const el = document.createElement('div');
    el.className = 'success-message show';
    el.textContent = message;
    const form = document.querySelector('.auth-form.active .form');
    if (form) {
      form.insertBefore(el, form.firstChild);
      setTimeout(() => el.remove(), 5000);
    }
  }

  clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
  }

  handleError(error) {
    let message = error.message || APP_CONFIG.ERROR_MESSAGES.GENERIC_ERROR;
    const containerId = document.getElementById('register-form')?.classList.contains('active')
      ? 'register-errors' : 'login-errors';

    if (error.status === 400 && error.data) {
      const errors = [];
      for (const [, msgs] of Object.entries(error.data)) {
        Array.isArray(msgs) ? errors.push(...msgs) : errors.push(msgs);
      }
      if (errors.length) message = errors;
    }

    this.showErrors(message, containerId);
  }

  isAuthenticated() { return api.isAuthenticated(); }

  redirectToApp() {
    const auth = document.getElementById('auth-container');
    const main = document.getElementById('main-app');
    if (auth && main) {
      auth.style.display = 'none';
      main.style.display = 'flex';
      window.dispatchEvent(new CustomEvent('auth:success'));
    }
  }

  async handleLogout() {
    try { await api.logout(); } catch { /* ignore */ }
    const auth = document.getElementById('auth-container');
    const main = document.getElementById('main-app');
    if (auth && main) {
      main.style.display = 'none';
      auth.style.display = 'flex';
      this.clearErrors();
      this.showForm('login');
      window.dispatchEvent(new CustomEvent('auth:logout:complete'));
    }
  }

  init() {
    if (this.isAuthenticated()) {
      this.redirectToApp();
      return true;
    }
    const auth = document.getElementById('auth-container');
    const main = document.getElementById('main-app');
    if (auth && main) {
      auth.style.display = 'flex';
      main.style.display = 'none';
    }
    return false;
  }
}

const authManager = new AuthManager();
window.authManager = authManager;
