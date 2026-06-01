import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const API_BASE_URL = 'http://10.72.10.97:4040';

// ─── 登录页 ──────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!account.trim() || !password) return Alert.alert('提示', '请输入账号和密码');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account.includes('@') ? { email: account, password } : { username: account, password }),
      });
      const data = await res.json();
      if (data.status === 0 && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.data));
        onLogin(data.token);
      } else {
        Alert.alert('登录失败', data.message || '请检查账号密码');
      }
    } catch (_) {
      Alert.alert('网络错误', '无法连接服务器');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>
        <View style={s.card}>
          <Text style={s.title}>Dorm</Text>
          <Text style={s.sub}>厦马小筑</Text>
          <TextInput style={s.input} value={account} onChangeText={setAccount} placeholder="学号 / 邮箱" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="密码" placeholderTextColor="#94a3b8" secureTextEntry />
          <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [s.btn, { opacity: pressed || loading ? 0.6 : 1 }]}>
            <Text style={s.btnText}>{loading ? '登录中...' : '登 录'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── 树洞首页 ────────────────────────────────────
function TreeholeScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/posts?page=1&pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.status === 0) setPosts(d.data?.list || []); })
      .catch(() => Alert.alert('加载失败', '无法获取帖子列表'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color="#0f172a" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.pageTitle}>🌳 树洞</Text>
        <Pressable onPress={onLogout}><Text style={s.logout}>退出</Text></Pressable>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={s.postCard}>
            <Text style={s.postAuthor}>{item.author?.nickname || item.author?.username || '匿名'}</Text>
            <Text style={s.postContent}>{item.content}</Text>
            <Text style={s.postMeta}>❤️ {item.like_count || 0}  💬 {item.comment_count || 0}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>暂无帖子</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

// ─── App ─────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      setToken(t);
      setChecking(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
  };

  if (checking) return <View style={s.centered}><ActivityIndicator size="large" /></View>;
  if (!token) return <LoginScreen onLogin={setToken} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <TreeholeScreen token={token} onLogout={handleLogout} />
    </SafeAreaProvider>
  );
}

// ─── 样式 ────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28 },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 14 },
  btn: { height: 50, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 8 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  logout: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  postCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  postContent: { fontSize: 15, color: '#334155', lineHeight: 22 },
  postMeta: { fontSize: 12, color: '#94a3b8', marginTop: 10 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 60 },
});
