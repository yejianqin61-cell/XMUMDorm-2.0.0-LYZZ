import { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL } from '../api/config';

const STORAGE_TOKEN = 'token';
const STORAGE_USER = 'user';
const STORAGE_PROFILE = 'profile';
const SESSION_SKIP_LOGIN = 'skipLogin';

function getStoredProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN));
  const [profile, setProfile] = useState(getStoredProfile);

  const isLoggedIn = !!token;

  /** 是否为商家（用于个人页展示「管理店铺」；后端返回 user.role === 'merchant' 或 user.is_merchant 时为 true；接 API 前可用 user.id === 1 做演示） */
  const isMerchant = user?.role === 'merchant' || user?.is_merchant === true || user?.id === 1;

  /** 展示用：用户名、头像（优先使用个人资料中的修改） */
  const displayName = profile.username ?? user?.username ?? '未设置';
  const displayAvatar = profile.avatar ?? user?.avatar ?? null;

  const updateProfile = useCallback((next) => {
    setProfile((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const login = useCallback(async (studentIdOrEmail, password) => {
    const isEmail = typeof studentIdOrEmail === 'string' && studentIdOrEmail.includes('@');
    const body = isEmail
      ? { email: studentIdOrEmail, password }
      : { student_id: studentIdOrEmail, password };

    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.status === 0 && data.token) {
      localStorage.setItem(STORAGE_TOKEN, data.token);
      if (data.data) localStorage.setItem(STORAGE_USER, JSON.stringify(data.data));
      setToken(data.token);
      setUser(data.data || null);
      return { success: true };
    }
    return { success: false, message: data.message || '登录失败，请检查学号/邮箱和密码' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_PROFILE);
    setProfile({});
  }, []);

  const skipLogin = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_SKIP_LOGIN, '1');
  }, []);

  const hasSkippedLogin = useCallback(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_SKIP_LOGIN) === '1';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        isMerchant,
        login,
        logout,
        skipLogin,
        hasSkippedLogin,
        displayName,
        displayAvatar,
        updateProfile,
        clearProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
