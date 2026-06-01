import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🍽️ 食堂</Text>
      <Text style={styles.hint}>V1.1 实现 — 区域/店铺/菜品/点评</Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  hint: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
