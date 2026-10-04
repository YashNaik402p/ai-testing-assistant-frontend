/**
 * AI Testing Assistant - Authentication Guard & Session Management
 */

const Auth = {
  getUser() {
    try {
      const userStr = localStorage.getItem(CONFIG.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (_) {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  isAuthenticated() {
    return !!API.getToken();
  },

  /**
   * Run this on protected pages to bounce unauthenticated visitors
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Run this on login page to redirect already logged-in users to dashboard
   */
  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = 'dashboard.html';
    }
  },

  logout() {
    API.clearAuth();
    UI.showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  },

  /**
   * Populate navbar user info
   */
  renderNavUser() {
    const user = this.getUser();
    const userEl = document.getElementById('nav-user-info');
    if (userEl) {
      if (user && user.email) {
        const initial = (user.name || user.email).charAt(0).toUpperCase();
        userEl.innerHTML = `
          <div class="user-badge">
            <span class="user-avatar">${initial}</span>
            <span>${UI.escapeHtml(user.name || user.email)}</span>
          </div>
          <button class="btn btn-secondary btn-icon" id="logout-btn" title="Sign Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => Auth.logout());
        }
      }
    }
  }
};

// Auto-mount nav user on load if present
document.addEventListener('DOMContentLoaded', () => {
  Auth.renderNavUser();
});
