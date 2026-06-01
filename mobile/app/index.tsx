import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TreeholeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🌳 树洞</Text>
      <Text style={styles.hint}>帖子列表加载中...</Text>
      <Link href="/login" style={styles.link}>去登录 →</Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  hint: { fontSize: 15, color: '#94a3b8' },
  link: { fontSize: 16, color: '#2563eb', fontWeight: '600', marginTop: 8 },
});
