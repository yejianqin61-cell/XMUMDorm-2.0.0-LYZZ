import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

interface Props {
  topicId: number;
  topicTitle: string;
  onBack: () => void;
  onDone: () => void;
}

export default function NewTrendingPostScreen({ topicId, topicTitle, onBack, onDone }: Props) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const { isLoggedIn } = useAuth();

  const addImage = () => {
    if (images.length >= 3) { Alert.alert('最多上传 3 张图片'); return; }
    // In real app, use expo-image-picker; for now accept a URL input
    Alert.prompt
      ? Alert.prompt('图片URL', '输入图片地址', (url: string) => {
          if (url?.trim()) setImages((prev) => [...prev, url.trim()]);
        })
      : setImages((prev) => [...prev, `https://picsum.photos/400/300?random=${Date.now()}`]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!content.trim()) { Alert.alert('请输入内容'); return; }
    if (content.length > 2000) { Alert.alert('内容不能超过 2000 字'); return; }

    setSending(true);
    try {
      const form = new FormData();
      form.append('content', content.trim());
      images.forEach((uri, i) => {
        form.append('images', { uri, name: `img_${i}.jpg`, type: 'image/jpeg' } as any);
      });

      const data = await apiPost(`/api/square/trending/${topicId}/posts`, form);
      if (data.status === 0) {
        Alert.alert('发布成功', '', [{ text: '好的', onPress: onDone }]);
      } else {
        Alert.alert('发布失败', data.message || '请稍后再试');
      }
    } catch {
      Alert.alert('网络错误');
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <Text style={s.title}>参与讨论</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.topicLabel}>话题：{topicTitle}</Text>

        <Text style={s.label}>内容 <Text style={s.limit}>{content.length}/2000</Text></Text>
        <TextInput
          style={s.input}
          value={content}
          onChangeText={setContent}
          placeholder="分享你的想法..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={2000}
        />

        <Text style={s.label}>图片 ({images.length}/3)</Text>
        <View style={s.imgRow}>
          {images.map((uri, i) => (
            <View key={i} style={s.imgWrap}>
              <Image source={{ uri }} style={s.preview} />
              <Pressable style={s.removeBtn} onPress={() => removeImage(i)}>
                <Text style={s.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {images.length < 3 && (
            <Pressable style={s.addBtn} onPress={addImage}>
              <Text style={s.addText}>+</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={handleSubmit} disabled={sending} style={[s.submitBtn, sending && { opacity: 0.5 }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>发布</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16 },
  topicLabel: { fontSize: 14, color: '#64748b', marginBottom: 16, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10 },

  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  limit: { fontSize: 11, color: '#94a3b8', fontWeight: '400' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 15, color: '#0f172a', backgroundColor: '#fff', minHeight: 140 },

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
