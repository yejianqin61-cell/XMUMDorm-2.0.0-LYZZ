import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';


export default function FoodReviewPublishScreen({ product, onBack }: { product: any; onBack: () => void }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return Alert.alert('请选择评分');
    if (!content.trim()) return Alert.alert('请输入点评内容');
    setSending(true);
    const form = new FormData();
    form.append('rating', String(rating));
    form.append('content', content.trim());
    try {
      const res = await fetch(`${API}/api/canteen/products/${product.id}/comments`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const data = await res.json();
      if (data.status === 0) { Alert.alert('发布成功', '', [{ text: '好的', onPress: onBack }]); }
      else { Alert.alert('发布失败', data.message); }
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <Text style={s.title}>发表点评</Text>
        <View style={{width:40}} />
      </View>
      <View style={s.body}>
        <Text style={s.productName}>{product?.name || '商品'}</Text>
        <Text style={s.label}>评分</Text>
        <View style={s.starRow}>
          {[1,2,3,4,5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)}>
              <Text style={[s.star, n<=rating&&s.starActive]}>{n<=rating?'★':'☆'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>点评内容</Text>
        <TextInput style={s.input} value={content} onChangeText={setContent} placeholder="分享你的用餐体验..." placeholderTextColor="#94a3b8" multiline numberOfLines={5} textAlignVertical="top" />
        <Pressable onPress={handleSubmit} disabled={sending} style={[s.btn, sending&&{opacity:0.5}]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>发布点评</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16 },
  productName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  starRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 32, color: '#e2e8f0' },
  starActive: { color: '#f59e0b' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 15, color: '#0f172a', backgroundColor: '#fff', minHeight: 120 },
  btn: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
