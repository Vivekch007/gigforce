import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8089';

// Paths that must NOT receive an Authorization header and must NOT trigger
// the global 401 -> logout/redirect handling (matches SecurityConfig's permitAll list).
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const TOKEN_STORAGE_KEY = 'gigforce_token';
const USER_STORAGE_KEY = 'gigforce_user';

function isPublicPath(url = '') {
  return PUBLIC_PATHS.some((path) => url.startsWith(path));
}

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (!isPublicPath(config.url)) {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';

    // Only force a logout/redirect for 401s on protected routes. A 401 from
    // /auth/login itself just means "bad credentials" and must stay on the page
    // so the form can show the error inline.
    if (error.response?.status === 401 && !isPublicPath(requestUrl)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { TOKEN_STORAGE_KEY, USER_STORAGE_KEY };
