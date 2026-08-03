import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './AuthContextInstance';
import * as authService from '../services/authService';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/apiClient';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  // Keep auth state in sync across browser tabs (e.g. logout in one tab).
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === TOKEN_STORAGE_KEY && !event.newValue) {
        setToken(null);
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loginUser = useCallback(async (credentials) => {
    const data = await authService.login(credentials); // { accessToken, email, role }
    setToken(data.accessToken);
    setUser({ email: data.email, role: data.role });
    return data;
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loginUser,
      logoutUser,
    }),
    [token, user, loginUser, logoutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
