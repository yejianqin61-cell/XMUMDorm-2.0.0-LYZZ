import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0.5,
          borderTopColor: '#e2e8f0',
          height: 54,
          paddingBottom: 4,
          paddingTop: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '树洞',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18 }}>🌳</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="eat"
        options={{
          title: '食堂',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18 }}>🍽️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="mailbox"
        options={{
          title: '信箱',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18 }}>📬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="square"
        options={{
          title: '广场',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18 }}>🏛️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="myzone"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
