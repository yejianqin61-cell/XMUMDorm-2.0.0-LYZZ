import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Image, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPatch } from '../api/client';

const DORM_AREAS = ['LY1', 'LY2', 'LY4', 'LY5', 'LY6', 'LY7', 'LY8', 'LY9', 'D1', 'D2', 'D3', 'D4', 'D5'];

interface Props { editId?: number; onBack: () => void; onDone: () => void; }

export default function MarketplacePublishScreen({ editId, onBack, onDone }: Props) {
  const isEdit = !!editId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [dormArea, setDormArea] = useState('LY1');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    apiGet('/api/marketplace/categories').then((r) => {
      if (r.status === 0) setCategories((r.data || []).filter((c: any) => c.slug !== 'all'));
    });
  }, []);

  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      apiGet(`/api/marketplace/items/${editId}`).then((r) => {
        if (r.status === 0) {
          const it = r.data;
          setTitle(it.title || '');
          setDescription(it.description || '');
          setPrice(String(it.price || ''));
          setCategory(it.category?.slug || '');
          setTags((it.tags || []).join(', '));
          setDeliveryMethod(it.delivery_method || 'pickup');
          setDormArea(it.dorm_area || 'LY1');
        }
        setLoadingEdit(false);
      });
    }
  }, [editId]);

  const addImage = () => {
    if (images.length >= 4) { Alert.alert('最多 4 张图片'); return; }
    setImages((prev) => [...prev, `https://picsum.photos/400/300?random=${Date.now()}`]);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!title.trim() || !description.trim() || !category || !price.trim()) {
      Alert.alert('请填写所有必填字段'); return;
    }

    setSending(true);
    try {
      if (isEdit) {
        const data = await apiPatch(`/api/marketplace/items/${editId}`, {
          title: title.trim(), description: description.trim(),
          price: parseFloat(price) || 0, category,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          delivery_method: deliveryMethod, dorm_area: dormArea,
        });
        if (data.status === 0) { Alert.alert('保存成功', '', [{ text: '好的', onPress: onDone }]); }
        else Alert.alert('保存失败', data.message);
      } else {
        const form = new FormData();
        form.append('title', title.trim());
        form.append('description', description.trim());
        form.append('price', String(parseFloat(price) || 0));
        form.append('category', category);
        form.append('delivery_method', deliveryMethod);
        form.append('dorm_area', dormArea);
        if (tags.trim()) form.append('tags', tags.trim());
        images.forEach((uri, i) => form.append('images', { uri, name: `img_${i}.jpg`, type: 'image/jpeg' } as any));

        const data = await apiPost('/api/marketplace/items', form);
        if (data.status === 0) { Alert.alert('发布成功', '', [{ text: '好的', onPress: onDone }]); }
        else Alert.alert('发布失败', data.message);
      }
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  if (loadingEdit) return <SafeAreaView style={s.bg} edges={['top']}><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>←</Text></Pressable>
        <Text style={s.headerTitle}>{isEdit ? '编辑商品' : '发布商品'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>标题 *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="商品名称" placeholderTextColor="#94a3b8" maxLength={120} />

        <Text style={s.label}>描述 *</Text>
        <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="商品描述..." placeholderTextColor="#94a3b8" multiline numberOfLines={5} textAlignVertical="top" maxLength={3000} />

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>价格 *</Text>
            <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="RM" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>分类 *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {categories.map((c: any) => (
                <Pressable key={c.slug} style={[s.catChip, category === c.slug && s.catChipActive]} onPress={() => setCategory(c.slug)}>
                  <Text style={[s.catChipText, category === c.slug && s.catChipTextActive]}>{c.name_zh || c.slug}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={s.label}>标签（逗号分隔）</Text>
        <TextInput style={s.input} value={tags} onChangeText={setTags} placeholder="例如: 九成新, 急出" placeholderTextColor="#94a3b8" />

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>配送方式</Text>
            <View style={s.toggleRow}>
              <Pressable style={[s.toggle, deliveryMethod === 'pickup' && s.toggleActive]} onPress={() => setDeliveryMethod('pickup')}><Text style={[s.toggleText, deliveryMethod === 'pickup' && s.toggleTextActive]}>自取</Text></Pressable>
              <Pressable style={[s.toggle, deliveryMethod === 'delivery' && s.toggleActive]} onPress={() => setDeliveryMethod('delivery')}><Text style={[s.toggleText, deliveryMethod === 'delivery' && s.toggleTextActive]}>配送</Text></Pressable>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>宿舍区域</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {DORM_AREAS.map((a) => (
                <Pressable key={a} style={[s.catChip, dormArea === a && s.catChipActive]} onPress={() => setDormArea(a)}>
                  <Text style={[s.catChipText, dormArea === a && s.catChipTextActive]}>{a}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {!isEdit && (
          <>
            <Text style={s.label}>图片 ({images.length}/4)</Text>
            <View style={s.imgRow}>
              {images.map((uri, i) => (
                <View key={i} style={s.imgWrap}>
                  <Image source={{ uri }} style={s.preview} />
                  <Pressable style={s.removeBtn} onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                    <Text style={s.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {images.length < 4 && <Pressable style={s.addBtn} onPress={addImage}><Text style={s.addText}>+</Text></Pressable>}
            </View>
          </>
        )}

        <Pressable onPress={handleSubmit} disabled={sending} style={[s.submitBtn, sending && { opacity: 0.5 }]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{isEdit ? '保存' : '发布商品'}</Text>}
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

  catScroll: { maxHeight: 40 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9', marginRight: 6 },
  catChipActive: { backgroundColor: '#0f172a' },
  catChipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  catChipTextActive: { color: '#fff' },

  toggleRow: { flexDirection: 'row', gap: 6 },
  toggle: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  toggleActive: { backgroundColor: '#0f172a' },
  toggleText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

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
