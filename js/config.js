/**
 * AI Testing Assistant - Application Configuration
 */
const CONFIG = {
  // Base URL of the FastAPI Backend
  // Change this to your deployed backend URL in production (e.g. 'https://api.yourdomain.com')
  API_BASE_URL: window.ENV_API_URL || 'http://localhost:8000',

  // LocalStorage keys
  TOKEN_KEY: 'ai_tester_token',
  USER_KEY: 'ai_tester_user',

  // Supported extensions mapping
  LANGUAGE_BY_EXTENSION: {
    py: 'Python',
    java: 'Java',
    js: 'JavaScript',
    ts: 'TypeScript',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    rb: 'Ruby',
    go: 'Go',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS'
  }
};
