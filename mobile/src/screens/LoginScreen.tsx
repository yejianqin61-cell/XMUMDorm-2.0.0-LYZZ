import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

interface Props { onGoRegister: () => void; }

export default function LoginScreen({ onGoRegister }: Props) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, skipLogin } = useAuth();

  const handleLogin = async () => {
    if (!account.trim() || !password) return Alert.alert('提示', '请输入账号和密码');
    setLoading(true);
    const result = await login(account.trim(), password);
    setLoading(false);
    if (!result.success) Alert.alert('登录失败', result.message || '请检查账号密码');
  };

  const handleSkip = async () => {
    await skipLogin();
  };

  return (
    <SafeAreaView style={s.bg}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.inner}>
        <View style={s.card}>
          <Text style={s.title}>Dorm</Text>
          <Text style={s.sub}>厦马小筑</Text>
          <TextInput style={s.input} value={account} onChangeText={setAccount} placeholder="学号 / 邮箱" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="密码" placeholderTextColor="#94a3b8" secureTextEntry />
          <Pressable onPress={handleLogin} disabled={loading} style={({pressed})=>[s.btn,{opacity:pressed||loading?0.6:1}]}>
            <Text style={s.btnText}>{loading?'登录中...':'登 录'}</Text>
          </Pressable>
          <View style={s.links}>
            <Pressable onPress={onGoRegister}><Text style={s.link}>注册账号</Text></Pressable>
            <Pressable onPress={handleSkip}><Text style={[s.link,{color:'#94a3b8'}]}>暂不登录</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#eef2ff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28 },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 14 },
  btn: { height: 50, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 4 },
  link: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
