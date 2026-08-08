import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8089';

// Paths that must NOT receive an Authorization header and must NOT trigger
// the global 401 -> logout/redirect handling (matches SecurityConfig's permitAll list).
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

const TOKEN_STORAGE_KEY = 'gigforce_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gigforce_refresh_token';
const USER_STORAGE_KEY = 'gigforce_user';

function isPublicPath(url = '') {
  if (!url) return false;
  let path = url;
  if (url.includes('/api/v1')) {
    path = url.split('/api/v1')[1] || '';
  } else if (url.includes('/api')) {
    path = url.split('/api')[1] || '';
  }
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

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
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    if (error.response?.status === 401 && !isPublicPath(requestUrl) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // Call refresh endpoint without triggering interceptor loops
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            
            localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
            
            isRefreshing = false;
            onRefreshed(accessToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = [];
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
            if (window.location.pathname !== '/login') {
              window.location.assign('/login');
            }
            return Promise.reject(refreshError);
          }
        }

        // Wait for the token to be refreshed by another request
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY };
