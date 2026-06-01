/**
 * 树洞首页 — 帖子列表
 * 第一阶段：简单占位，后续替换为完整 PostCard 列表
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StyledButton from '../src/components/ui/StyledButton';

export default function TreeholeScreen() {
  const { isLoggedIn, displayName, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dorm 树洞</Text>
        {isLoggedIn ? (
          <View style={styles.userRow}>
            <Text style={styles.welcome}>Hi, {displayName}</Text>
            <StyledButton title="退出" onPress={logout} variant="secondary" style={styles.logoutBtn} />
          </View>
        ) : (
          <Link href="/login" asChild>
            <StyledButton title="登录" onPress={() => {}} variant="primary" style={styles.loginBtn} />
          </Link>
        )}
      </View>

      {isLoggedIn && (
        <View style={styles.actions}>
          <Link href="/post/new" asChild>
            <StyledButton title="+ 发帖" onPress={() => {}} variant="primary" />
          </Link>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.placeholder}>
          {isLoggedIn ? '帖子列表加载中...\n（第一阶段后续实现）' : '请先登录以查看树洞内容'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  welcome: { fontSize: 14, color: '#64748b' },
  logoutBtn: { height: 32, paddingHorizontal: 12, borderRadius: 8 },
  loginBtn: { marginTop: 12, alignSelf: 'flex-start' },
  actions: { paddingHorizontal: 20, paddingBottom: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 24 },
});
