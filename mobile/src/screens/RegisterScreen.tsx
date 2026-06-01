import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../api/config';

interface Props { onBack: () => void; }

export default function RegisterScreen({ onBack }: Props) {
  const [role, setRole] = useState<'student'|'merchant'>('student');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendCode = async () => {
    if (!email.trim().endsWith('@xmu.edu.my') && role === 'student') {
      return Alert.alert('提示', '请使用 @xmu.edu.my 邮箱');
    }
    setSendingCode(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), purpose: 'register' }),
      });
      const data = await res.json();
      if (data.status === 0) {
        Alert.alert('已发送', '验证码已发送到你的邮箱');
        setCountdown(60);
        const timer = setInterval(() => setCountdown((c) => { if (c<=1) {clearInterval(timer);return 0;} return c-1; }), 1000);
      } else {
        Alert.alert('发送失败', data.message || '请稍后重试');
      }
    } catch { Alert.alert('网络错误'); }
    setSendingCode(false);
  };

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password) return Alert.alert('提示', '请填写所有字段');
    if (role === 'student' && !email.endsWith('@xmu.edu.my')) return Alert.alert('提示', '学生必须使用 @xmu.edu.my 邮箱');
    if (password.length < 6) return Alert.alert('提示', '密码至少 6 位');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: email.trim(), username: username.trim(), password, code: code.trim() }),
      });
      const data = await res.json();
      if (data.status === 0) {
        Alert.alert('注册成功', '请登录', [{ text: '去登录', onPress: onBack }]);
      } else {
        Alert.alert('注册失败', data.message || '请检查信息');
      }
    } catch { Alert.alert('网络错误'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.bg}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Pressable onPress={onBack}><Text style={s.back}>← 返回登录</Text></Pressable>
          <Text style={s.title}>注册 Dorm</Text>

          {/* 角色选择 */}
          <View style={s.roleRow}>
            <Pressable style={[s.roleBtn, role==='student'&&s.roleActive]} onPress={()=>setRole('student')}>
              <Text style={[s.roleText, role==='student'&&s.roleTextActive]}>🎓 学生</Text>
            </Pressable>
            <Pressable style={[s.roleBtn, role==='merchant'&&s.roleActive]} onPress={()=>setRole('merchant')}>
              <Text style={[s.roleText, role==='merchant'&&s.roleTextActive]}>🏪 商家</Text>
            </Pressable>
          </View>

          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder={role==='student'?'邮箱 (@xmu.edu.my)':'邮箱'} placeholderTextColor="#94a3b8" autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="用户名" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="密码（至少6位）" placeholderTextColor="#94a3b8" secureTextEntry />

          {/* 验证码 */}
          <View style={s.codeRow}>
            <TextInput style={[s.input, s.codeInput]} value={code} onChangeText={setCode} placeholder="验证码" placeholderTextColor="#94a3b8" keyboardType="number-pad" />
            <Pressable style={[s.codeBtn, (countdown>0||sendingCode)&&s.codeBtnDisabled]} onPress={sendCode} disabled={countdown>0||sendingCode}>
              <Text style={s.codeBtnText}>{countdown>0?`${countdown}s`:'发送验证码'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleRegister} disabled={loading} style={({pressed})=>[s.btn,{opacity:pressed||loading?0.6:1}]}>
            <Text style={s.btnText}>{loading?'注册中...':'注 册'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#eef2ff' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center' },
  roleActive: { borderColor: '#0f172a', backgroundColor: '#0f172a' },
  roleText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 14 },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  codeInput: { flex: 1, marginBottom: 0 },
  codeBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center' },
  codeBtnDisabled: { backgroundColor: '#94a3b8' },
  codeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', whiteSpace: 'nowrap' },
  btn: { height: 50, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
