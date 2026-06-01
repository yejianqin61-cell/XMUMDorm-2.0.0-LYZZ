import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

const STORAGE_TOKEN = 'token';
const STORAGE_USER = 'user';

interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  role?: string;
  avatar?: string;
  level?: number;
  exp?: number;
  badge?: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  displayName: string;
  login: (account: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(STORAGE_TOKEN);
      if (t) {
        setToken(t);
        try {
          const raw = await AsyncStorage.getItem(STORAGE_USER);
          if (raw) setUser(JSON.parse(raw));
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account.includes('@') ? { email: account, password } : { username: account, password }),
      });
      const data = await res.json();
      if (data.status === 0 && data.token) {
        await AsyncStorage.setItem(STORAGE_TOKEN, data.token);
        if (data.data) await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data.data));
        setToken(data.token);
        setUser(data.data || null);
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (e: any) {
      return { success: false, message: e.message || '网络错误' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER]);
    setToken(null);
    setUser(null);
  }, []);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{
      user, token, isLoggedIn: !!token,
      isAdmin: user?.role === 'admin',
      displayName: user?.nickname || user?.username || '未设置',
      login, logout,
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
