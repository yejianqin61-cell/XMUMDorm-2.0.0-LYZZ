import React from 'react';
import { Tabs } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { Text } from 'react-native';

const queryClient = new QueryClient();

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{label}</Text>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: '#0f172a',
              tabBarInactiveTintColor: '#94a3b8',
              headerShown: false,
            }}
          >
            <Tabs.Screen name="index" options={{ title: '树洞', tabBarIcon: ({ color }) => <TabIcon label="🌳" color={color} /> }} />
            <Tabs.Screen name="eat" options={{ title: '食堂', tabBarIcon: ({ color }) => <TabIcon label="🍽️" color={color} /> }} />
            <Tabs.Screen name="square" options={{ title: '广场', tabBarIcon: ({ color }) => <TabIcon label="🏛️" color={color} /> }} />
            <Tabs.Screen name="myzone" options={{ title: '我的', tabBarIcon: ({ color }) => <TabIcon label="👤" color={color} /> }} />
            <Tabs.Screen name="mailbox" options={{ title: '信箱', tabBarIcon: ({ color }) => <TabIcon label="📬" color={color} /> }} />
          </Tabs>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
