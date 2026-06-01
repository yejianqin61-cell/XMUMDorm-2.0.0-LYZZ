import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCachedToken } from '../api/request';
import { API_BASE_URL } from '../api/config';

const STORAGE_TOKEN = 'token';
const STORAGE_USER = 'user';
const STORAGE_SKIP = 'skipLogin';

interface User {
  id: number; username: string; nickname?: string; email?: string;
  role?: string; avatar?: string; level?: number; exp?: number; badge?: string;
}

interface AuthCtx {
  user: User | null; token: string | null;
  isLoggedIn: boolean; isGuest: boolean;
  isAdmin: boolean; displayName: string;
  login: (account: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  skipLogin: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

/** 解析 JWT exp 是否过期 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch { return false; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [ready, setReady] = useState(false);

  // 启动时恢复登录态 / 游客态
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(STORAGE_TOKEN);
        if (t && !isTokenExpired(t)) {
          setToken(t); setCachedToken(t);
          const raw = await AsyncStorage.getItem(STORAGE_USER);
          if (raw) setUser(JSON.parse(raw));
        } else if (t) {
          // token 过期，清理
          await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER]);
        }
        // 游客
        const skipped = await AsyncStorage.getItem(STORAGE_SKIP);
        if (skipped === '1') setIsGuest(true);
      } catch {}
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account.includes('@') ? { email: account, password } : { username: account, password }),
      });
      const data = await res.json();
      if (data.status === 0 && data.token) {
        await AsyncStorage.setItem(STORAGE_TOKEN, data.token);
        await AsyncStorage.removeItem(STORAGE_SKIP);
        if (data.data) await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data.data));
        setToken(data.token); setCachedToken(data.token);
        setUser(data.data || null); setIsGuest(false);
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (e: any) {
      return { success: false, message: e.message || '网络错误' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER, STORAGE_SKIP]);
    setToken(null); setUser(null); setIsGuest(false); setCachedToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = await AsyncStorage.getItem(STORAGE_TOKEN);
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (data.status === 0) { setUser(data.data); await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data.data)); }
    } catch {}
  }, []);

  const skipLogin = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_SKIP, '1');
    setIsGuest(true);
  }, []);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{
      user, token,
      isLoggedIn: !!token && !isTokenExpired(token),
      isGuest,
      isAdmin: user?.role === 'admin',
      displayName: user?.nickname || user?.username || '游客',
      login, logout, skipLogin, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { STORAGE_TOKEN };
