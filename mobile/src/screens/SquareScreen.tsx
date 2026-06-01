import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SquareScreen() {
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <Text style={s.title}>🏛️ 广场</Text>
      <Text style={s.hint}>热搜 / 校园此刻 — 即将上线</Text>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  hint: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
