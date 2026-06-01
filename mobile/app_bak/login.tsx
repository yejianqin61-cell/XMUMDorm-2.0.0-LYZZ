import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/api/config';

export default function LoginScreen() {
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
        router.replace('/');
      } else {
        Alert.alert('登录失败', data.message || '请检查账号密码');
      }
    } catch (_) {
      Alert.alert('网络错误', '无法连接服务器，请确认手机和电脑在同一WiFi');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.title}>Dorm</Text>
          <Text style={styles.sub}>厦马小筑</Text>
          <TextInput style={styles.input} value={account} onChangeText={setAccount} placeholder="学号 / 邮箱" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="密码" placeholderTextColor="#94a3b8" secureTextEntry />
          <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [styles.btn, { opacity: pressed || loading ? 0.6 : 1 }]}>
            <Text style={styles.btnText}>{loading ? '登录中...' : '登 录'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 28, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.6)' },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 14 },
  btn: { height: 50, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
