import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen';

const queryClient = new QueryClient();

function MainApp() {
  const { isLoggedIn, isGuest } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // ProfileEdit 全屏覆盖
  if (showProfileEdit) return <ProfileEditScreen onBack={() => setShowProfileEdit(false)} />;
  // 已登录或游客 → 进入主页
  if (isLoggedIn || isGuest) return <TabNavigator onEditProfile={() => setShowProfileEdit(true)} />;
  // 注册页
  if (showRegister) return <RegisterScreen onBack={() => setShowRegister(false)} />;
  // 登录页
  return <LoginScreen onGoRegister={() => setShowRegister(true)} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
