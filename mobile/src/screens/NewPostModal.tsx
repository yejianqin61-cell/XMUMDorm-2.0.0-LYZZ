import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Modal, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

interface Props { visible: boolean; onClose: () => void; onCreated: () => void; }

export default function NewPostModal({ visible, onClose, onCreated }: Props) {
  const { token } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('需要相册权限');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3, quality: 0.7,
    });
    if (!result.canceled) setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return Alert.alert('内容不能为空');
    setSending(true);
    const form = new FormData();
    form.append('content', content.trim());
    for (const uri of images) {
      form.append('images', { uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` } as any);
    }
    const data = await apiPost('/api/posts', form);
    setSending(false);
    if (data.status === 0) { onCreated(); } else { Alert.alert('发布失败', data.message); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.bg}>
        <View style={s.topbar}>
          <Text style={s.cancelBtn} onPress={onClose}>取消</Text>
          <Text style={s.topTitle}>发布帖子</Text>
          <Pressable onPress={handleSubmit} disabled={sending} style={[s.publishBtn, (!content.trim()) && { opacity: 0.3 }]}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.publishText}>发布</Text>}
          </Pressable>
        </View>
        <TextInput style={s.input} value={content} onChangeText={setContent} placeholder="分享你的想法..." placeholderTextColor="#94a3b8" multiline numberOfLines={6} textAlignVertical="top" />
        <ScrollView horizontal style={s.imgRow}>
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={s.thumb} />
          ))}
          {images.length < 3 && (
            <Pressable style={s.addImgBtn} onPress={pickImages}><Text style={s.addImgText}>+ 图片</Text></Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  cancelBtn: { fontSize: 15, color: '#64748b' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  publishBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#0f172a' },
  publishText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  input: { margin: 16, fontSize: 16, minHeight: 150, color: '#0f172a', lineHeight: 24 },
  imgRow: { paddingHorizontal: 16, gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  addImgBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addImgText: { fontSize: 13, color: '#94a3b8' },
});
