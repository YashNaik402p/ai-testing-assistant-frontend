/**
 * AI Testing Assistant - Login & Register Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go straight to dashboard
  Auth.redirectIfAuthenticated();

  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');

  function showLogin() {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  }

  function showRegister() {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }

  tabLoginBtn.addEventListener('click', showLogin);
  tabRegisterBtn.addEventListener('click', showRegister);
  if (switchToRegister) switchToRegister.addEventListener('click', showRegister);
  if (switchToLogin) switchToLogin.addEventListener('click', showLogin);

  // Handle Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    if (!email || !password) {
      UI.showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      UI.setButtonLoading(submitBtn, true, 'Signing In...');
      const res = await API.login(email, password);

      // Save user profile in storage
      Auth.setUser({ email, name: email.split('@')[0] });
      UI.showToast('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } catch (err) {
      UI.showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      UI.setButtonLoading(submitBtn, false);
    }
  });

  // Handle Register Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const submitBtn = document.getElementById('register-submit-btn');

    if (!name || !email || !password) {
      UI.showToast('Please fill out all registration fields', 'error');
      return;
    }

    try {
      UI.setButtonLoading(submitBtn, true, 'Creating Account...');
      const res = await API.register(name, email, password);

      UI.showToast('Account created successfully! Logging you in...', 'success');
      
      // Auto login after registration
      const loginRes = await API.login(email, password);
      Auth.setUser({ email: res.email, name: res.name });

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (err) {
      UI.showToast(err.message || 'Registration failed. Try again.', 'error');
    } finally {
      UI.setButtonLoading(submitBtn, false);
    }
  });
});
