import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ExpFeedbackProvider } from './src/context/ExpFeedbackContext';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen';
import AboutLevelScreen from './src/screens/AboutLevelScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import TodoScreen from './src/screens/TodoScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import AdminScreen from './src/screens/AdminScreen';
import AboutProfileScreen from './src/screens/AboutProfileScreen';
import AboutThanksScreen from './src/screens/AboutThanksScreen';
import AboutInfoScreen from './src/screens/AboutInfoScreen';

const queryClient = new QueryClient();

function MainApp() {
  const { isLoggedIn, isGuest } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showAboutLevel, setShowAboutLevel] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showTodo, setShowTodo] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAboutProfile, setShowAboutProfile] = useState(false);
  const [showAboutThanks, setShowAboutThanks] = useState(false);
  const [showAboutInfo, setShowAboutInfo] = useState(false);

  if (showProfileEdit) return <ProfileEditScreen onBack={() => setShowProfileEdit(false)} />;
  if (showAboutLevel) return <AboutLevelScreen onBack={() => setShowAboutLevel(false)} />;
  if (showDiary) return <DiaryScreen onBack={() => setShowDiary(false)} />;
  if (showTodo) return <TodoScreen onBack={() => setShowTodo(false)} />;
  if (showSchedule) return <ScheduleScreen onBack={() => setShowSchedule(false)} />;
  if (showAdmin) return <AdminScreen onBack={() => setShowAdmin(false)} />;
  if (showAboutProfile) return <AboutProfileScreen onBack={() => setShowAboutProfile(false)} />;
  if (showAboutThanks) return <AboutThanksScreen onBack={() => setShowAboutThanks(false)} />;
  if (showAboutInfo) return <AboutInfoScreen onBack={() => setShowAboutInfo(false)} />;
  if (isLoggedIn || isGuest) return <TabNavigator onEditProfile={() => setShowProfileEdit(true)} onAboutLevel={() => setShowAboutLevel(true)} onDiary={() => setShowDiary(true)} onTodo={() => setShowTodo(true)} onSchedule={() => setShowSchedule(true)} onAdmin={() => setShowAdmin(true)} onAboutProfile={() => setShowAboutProfile(true)} onAboutThanks={() => setShowAboutThanks(true)} onAboutInfo={() => setShowAboutInfo(true)} />;
  if (showRegister) return <RegisterScreen onBack={() => setShowRegister(false)} />;
  return <LoginScreen onGoRegister={() => setShowRegister(true)} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <ExpFeedbackProvider>
              <MainApp />
            </ExpFeedbackProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
