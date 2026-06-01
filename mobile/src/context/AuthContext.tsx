/**
 * 认证 Context（React Native 版）
 * 基于 AsyncStorage 替代 localStorage
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';
import { getMe } from '../api/users';
import { setCachedToken } from '../api/request';

const STORAGE_TOKEN = 'token';
const STORAGE_USER = 'user';

interface User {
  id: number;
  username: string;
  email?: string;
  role?: string;
  avatar?: string;
  nickname?: string;
  level?: number;
  exp?: number;
  badge?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isMerchant: boolean;
  isAdmin: boolean;
  userLoading: boolean;
  displayName: string;
  displayAvatar: string | null;
  login: (account: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // 恢复登录态
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(STORAGE_TOKEN);
        const savedUser = await AsyncStorage.getItem(STORAGE_USER);
        if (savedToken) {
          setToken(savedToken);
          setCachedToken(savedToken);
          if (savedUser) setUser(JSON.parse(savedUser));
          // 拉取最新用户信息
          setUserLoading(true);
          try {
            const data = await getMe();
            setUser(data);
            await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data));
          } catch (_) {}
          setUserLoading(false);
        }
      } catch (_) {}
    })();
  }, []);

  const isLoggedIn = !!token;
  const isMerchant = user?.role === 'merchant';
  const isAdmin = user?.role === 'admin';
  const displayName = user?.nickname || user?.username || '未设置';
  const displayAvatar = user?.avatar || null;

  const login = useCallback(async (account: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          account.includes('@') ? { email: account, password } : { username: account, password }
        ),
      });
      const data = await res.json();

      if (data.status === 0 && data.token) {
        await AsyncStorage.setItem(STORAGE_TOKEN, data.token);
        if (data.data) await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data.data));
        setToken(data.token);
        setCachedToken(data.token);
        setUser(data.data || null);
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (e: any) {
      return { success: false, message: e.message || '网络错误，请检查网络连接' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER]);
    setToken(null);
    setUser(null);
    setCachedToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    setUserLoading(true);
    try {
      const data = await getMe();
      setUser(data);
      await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(data));
    } catch (_) {}
    setUserLoading(false);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoggedIn, isMerchant, isAdmin,
        userLoading, displayName, displayAvatar,
        login, logout, refreshUser,
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
