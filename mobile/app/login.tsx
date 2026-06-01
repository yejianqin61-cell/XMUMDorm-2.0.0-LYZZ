import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import GlassView from '../src/components/ui/GlassView';
import StyledInput from '../src/components/ui/StyledInput';
import StyledButton from '../src/components/ui/StyledButton';

export default function LoginScreen() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!account.trim() || !password) {
      return Alert.alert('提示', '请输入账号和密码');
    }
    setLoading(true);
    const result = await login(account.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/');
    } else {
      Alert.alert('登录失败', result.message || '请检查账号密码');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <GlassView style={styles.card}>
          <Text style={styles.title}>Dorm</Text>
          <Text style={styles.subtitle}>厦马小筑</Text>

          <StyledInput
            label="学号 / 邮箱"
            value={account}
            onChangeText={setAccount}
            placeholder="请输入学号或邮箱"
          />
          <StyledInput
            label="密码"
            value={password}
            onChangeText={setPassword}
            placeholder="请输入密码"
            secureTextEntry
          />

          <StyledButton title="登 录" onPress={handleLogin} loading={loading} />
        </GlassView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { padding: 24 },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 28, marginTop: 4 },
});
