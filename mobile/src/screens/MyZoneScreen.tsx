import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function MyZoneScreen() {
  const { isLoggedIn, user, displayName, logout } = useAuth();

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <Text style={s.title}>👤 我的</Text>
      {isLoggedIn ? (
        <View style={s.card}>
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.info}>@{user?.username} · Lv{user?.level || 1}</Text>
          <Pressable onPress={logout} style={s.logoutBtn}><Text style={s.logoutText}>退出登录</Text></Pressable>
        </View>
      ) : (
        <Text style={s.hint}>请先登录</Text>
      )}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 16 },
  card: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  info: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  hint: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  logoutBtn: { marginTop: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});
