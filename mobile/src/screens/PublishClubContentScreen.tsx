import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

interface Props {
  clubId: number;
  contentType: 'activity' | 'post';
  onBack: () => void;
  onDone: () => void;
}

export default function PublishClubContentScreen({ clubId, contentType, onBack, onDone }: Props) {
  const isActivity = contentType === 'activity';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('');
  const [startTime, setStartTime] = useState('');
  const [location, setLocation] = useState('');
  const [signupLink, setSignupLink] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const { isLoggedIn } = useAuth();

  const addImage = () => {
    if (images.length >= 4) { Alert.alert('最多 4 张图片'); return; }
    setImages((prev) => [...prev, `https://picsum.photos/400/300?random=${Date.now()}`]);
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!title.trim()) { Alert.alert('请输入标题'); return; }
    if (isActivity && !content.trim() && !content) { /* summary optional */ }
    if (!isActivity && !content.trim()) { Alert.alert('请输入内容'); return; }

    setSending(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      if (isActivity) {
        form.append('summary', content.trim());
        if (tag.trim()) form.append('tag', tag.trim());
        if (startTime.trim()) form.append('start_time', startTime.trim());
        if (location.trim()) form.append('location', location.trim());
        if (signupLink.trim()) form.append('signup_link', signupLink.trim());
      } else {
        form.append('content', content.trim());
      }
      images.forEach((uri, i) => {
        form.append('images', { uri, name: `img_${i}.jpg`, type: 'image/jpeg' } as any);
      });

      const endpoint = isActivity ? `/api/clubs/${clubId}/activities` : `/api/clubs/${clubId}/posts`;
      const data = await apiPost(endpoint, form);
      if (data.status === 0) {
        Alert.alert('发布成功', '', [{ text: '好的', onPress: onDone }]);
      } else {
        Alert.alert('发布失败', data.message);
      }
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  return (
    <SafeAreaView style={st.bg} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={onBack}><Text style={st.back}>←</Text></Pressable>
        <Text style={st.headerTitle}>{isActivity ? '发布活动' : '发布日常'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.label}>标题 *</Text>
        <TextInput style={st.input} value={title} onChangeText={setTitle} placeholder={isActivity ? '活动标题' : '帖子标题（可选）'} placeholderTextColor="#94a3b8" maxLength={160} />

        {isActivity && (
          <>
            <Text style={st.label}>类别标签</Text>
            <TextInput style={st.input} value={tag} onChangeText={setTag} placeholder="例如：讲座, 工作坊" placeholderTextColor="#94a3b8" maxLength={20} />

            <Text style={st.label}>简介</Text>
            <TextInput style={[st.input, st.textArea]} value={content} onChangeText={setContent} placeholder="活动简介..." placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" maxLength={255} />

            <View style={st.row2}>
              <View style={{ flex: 1 }}>
                <Text style={st.label}>开始时间</Text>
                <TextInput style={st.input} value={startTime} onChangeText={setStartTime} placeholder="2026-06-01 20:00" placeholderTextColor="#94a3b8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.label}>地点</Text>
                <TextInput style={st.input} value={location} onChangeText={setLocation} placeholder="地点" placeholderTextColor="#94a3b8" maxLength={160} />
              </View>
            </View>

            <Text style={st.label}>报名链接</Text>
            <TextInput style={st.input} value={signupLink} onChangeText={setSignupLink} placeholder="https://..." placeholderTextColor="#94a3b8" />
          </>
        )}

        {!isActivity && (
          <>
            <Text style={st.label}>内容 *</Text>
            <TextInput style={[st.input, st.textArea]} value={content} onChangeText={setContent} placeholder="分享社团日常..." placeholderTextColor="#94a3b8" multiline numberOfLines={6} textAlignVertical="top" maxLength={5000} />
          </>
        )}

        <Text style={st.label}>图片 ({images.length}/4)</Text>
        <View style={st.imgRow}>
          {images.map((uri, i) => (
            <View key={i} style={st.imgWrap}>
              <Image source={{ uri }} style={st.preview} />
              <Pressable style={st.removeBtn} onPress={() => removeImage(i)}><Text style={st.removeText}>✕</Text></Pressable>
            </View>
          ))}
          {images.length < 4 && <Pressable style={st.addBtn} onPress={addImage}><Text style={st.addText}>+</Text></Pressable>}
        </View>

        <Pressable onPress={handleSubmit} disabled={sending} style={[st.submitBtn, sending && { opacity: 0.5 }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={st.submitText}>发布</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 60 },

  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  textArea: { minHeight: 100 },
  row2: { flexDirection: 'row', gap: 10 },

  imgRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imgWrap: { position: 'relative' },
  preview: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f1f5f9' },
  removeBtn: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 28, color: '#94a3b8' },

  submitBtn: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
