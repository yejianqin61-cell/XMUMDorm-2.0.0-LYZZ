import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

export default function MyZoneScreen() {
  const { isLoggedIn, displayName } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{isLoggedIn ? `👤 ${displayName}` : '👤 我的'}</Text>
      <Text style={styles.hint}>V1.2 实现 — 个人空间/课表/日记/待办</Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  hint: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
