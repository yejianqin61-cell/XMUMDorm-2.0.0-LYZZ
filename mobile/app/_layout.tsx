/**
 * 根布局：Tab Navigator + Providers
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { Home, UtensilsCrossed, LayoutGrid, User, Bell } from 'lucide-react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: '#0f172a',
              tabBarInactiveTintColor: '#94a3b8',
              tabBarStyle: {
                backgroundColor: '#fff',
                borderTopColor: '#f1f5f9',
                height: 60,
                paddingBottom: 8,
                paddingTop: 4,
              },
              tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
              headerShown: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: '树洞',
                tabBarIcon: ({ color }) => <Home color={color} size={22} />,
              }}
            />
            <Tabs.Screen
              name="eat"
              options={{
                title: '食堂',
                tabBarIcon: ({ color }) => <UtensilsCrossed color={color} size={22} />,
              }}
            />
            <Tabs.Screen
              name="square"
              options={{
                title: '广场',
                tabBarIcon: ({ color }) => <LayoutGrid color={color} size={22} />,
              }}
            />
            <Tabs.Screen
              name="myzone"
              options={{
                title: '我的',
                tabBarIcon: ({ color }) => <User color={color} size={22} />,
              }}
            />
            <Tabs.Screen
              name="mailbox"
              options={{
                title: '信箱',
                tabBarIcon: ({ color }) => <Bell color={color} size={22} />,
              }}
            />
          </Tabs>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
