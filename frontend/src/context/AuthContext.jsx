import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../api/config';
import { getMe } from '../api/users';
import { getApiErrorMessage, apiFailureFromResponse } from '../utils/apiError';

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

function normalizeAvatar(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
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
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  const isLoggedIn = !!token;

  /** 登录后从 API 拉取当前用户（/me），用于头像、昵称、本周点评数等 */
  const refreshUser = useCallback(() => {
    if (!token) return Promise.resolve();
    setUserLoading(true);
    setUserError(null);
    return getMe()
      .then((data) => {
        const u = {
          ...data,
          avatar: normalizeAvatar(data.avatar),
        };
        setUser(u);
        try {
          localStorage.setItem(STORAGE_USER, JSON.stringify(u));
        } catch (_) {}
        return u;
      })
      .catch((err) => {
        setUserError(getApiErrorMessage(err));
        throw err;
      })
      .finally(() => setUserLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshUser();
  }, [token, refreshUser]);

  /** 是否为商家（后端 user.role === 'merchant'） */
  const isMerchant = user?.role === 'merchant' || user?.is_merchant === true;
  /** 是否为管理员（后端 user.role === 'admin'） */
  const isAdmin = user?.role === 'admin';

  /** 展示用：用户名、头像（API 返回的 nickname/username、avatar） */
  const displayName = user?.nickname ?? user?.username ?? profile?.username ?? '未设置';
  const displayAvatar = profile.avatar ?? user?.avatar ?? null;

  const updateProfile = useCallback((next) => {
    setProfile((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const login = useCallback(async (account, password) => {
    const s = typeof account === 'string' ? account.trim() : '';
    const isEmail = s.includes('@');
    const body = isEmail ? { email: s, password } : { username: s, password };

    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      return { success: false, message: getApiErrorMessage() };
    }

    let data = null;
    try {
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = (await res.text()).trim();
        return {
          success: false,
          message: getApiErrorMessage({
            message: text || undefined,
            status: res.status,
          }),
        };
      }
    } catch {
      return {
        success: false,
        message: getApiErrorMessage({ status: res.status }),
      };
    }

    if (data && data.status === 0 && data.token) {
      localStorage.setItem(STORAGE_TOKEN, data.token);
      if (data.data) localStorage.setItem(STORAGE_USER, JSON.stringify(data.data));
      setToken(data.token);
      setUser(data.data || null);
      return { success: true, exp: data.exp || null };
    }

    return {
      success: false,
      message: getApiErrorMessage(apiFailureFromResponse(res, data)),
    };
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
        isAdmin,
        userLoading,
        userError,
        refreshUser,
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
