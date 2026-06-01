import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MailboxScreen() {
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <Text style={s.title}>📬 信箱</Text>
      <Text style={s.hint}>通知中心 — 即将上线</Text>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  hint: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
