import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

interface Props { onBack: () => void; onDone: (newId: number) => void; }

const TYPE_OPTIONS = [
  { key: 'delivery', label: '代取 📦' },
  { key: 'purchase', label: '代购 🛍️' },
  { key: 'urgent', label: '紧急 ⚡' },
];

export default function PublishErrandScreen({ onBack, onDone }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('delivery');
  const [contactInfo, setContactInfo] = useState('');
  const [sending, setSending] = useState(false);
  const { isLoggedIn } = useAuth();

  const handleSubmit = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!title.trim()) { Alert.alert('请输入标题'); return; }
    if (!contactInfo.trim()) { Alert.alert('请输入联系方式'); return; }

    setSending(true);
    try {
      const data = await apiPost('/api/errands', {
        title: title.trim(),
        description: description.trim(),
        reward: parseFloat(reward) || 0,
        deadline: deadline.trim() || undefined,
        location: location.trim() || undefined,
        type,
        contactInfo: contactInfo.trim(),
      });
      if (data.status === 0) {
        Alert.alert('发布成功', '', [{ text: '好的', onPress: () => onDone(data.data.id) }]);
      } else {
        Alert.alert('发布失败', data.message);
      }
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <Text style={s.headerTitle}>发布任务</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>任务类型</Text>
        <View style={s.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <Pressable key={opt.key} style={[s.typeOpt, type === opt.key && s.typeOptActive]} onPress={() => setType(opt.key)}>
              <Text style={[s.typeOptText, type === opt.key && s.typeOptTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>标题 *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="例如：帮我去D6取快递" placeholderTextColor="#94a3b8" maxLength={120} />

        <Text style={s.label}>描述</Text>
        <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="描述任务细节..." placeholderTextColor="#94a3b8" multiline numberOfLines={5} textAlignVertical="top" maxLength={5000} />

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>酬劳 (RM)</Text>
            <TextInput style={s.input} value={reward} onChangeText={setReward} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={s.label}>截止时间</Text>
            <TextInput style={s.input} value={deadline} onChangeText={setDeadline} placeholder="2026-06-01 20:30" placeholderTextColor="#94a3b8" />
          </View>
        </View>

        <Text style={s.label}>地点</Text>
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="例如：D6 宿舍楼" placeholderTextColor="#94a3b8" maxLength={120} />

        <Text style={s.label}>联系方式 *</Text>
        <TextInput style={s.input} value={contactInfo} onChangeText={setContactInfo} placeholder="微信/手机号等" placeholderTextColor="#94a3b8" maxLength={255} />

        <Pressable onPress={handleSubmit} disabled={sending} style={[s.submitBtn, sending && { opacity: 0.5 }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>发布任务</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 60 },

  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  textArea: { minHeight: 120 },
  row2: { flexDirection: 'row', gap: 10 },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeOpt: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  typeOptActive: { backgroundColor: '#0f172a' },
  typeOptText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  typeOptTextActive: { color: '#fff' },

  submitBtn: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
