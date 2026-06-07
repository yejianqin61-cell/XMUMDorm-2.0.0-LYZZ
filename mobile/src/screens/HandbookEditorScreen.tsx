import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPatch } from '../utils/http';

export default function HandbookEditorScreen({ editId, onBack, onDone }: { editId?: number; onBack: () => void; onDone: () => void }) {
  const isEdit = !!editId;
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverPath, setCoverPath] = useState('');
  const [tabId, setTabId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [sending, setSending] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [tabOptions, setTabOptions] = useState<any[]>([]);
  const [tagOptions, setTagOptions] = useState<any[]>([]);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([apiGet('/api/handbook/tabs'), apiGet('/api/handbook/tags')]).then(([t, g]) => {
      if (t.status === 0) setTabOptions(t.data || []);
      if (g.status === 0) setTagOptions(g.data || []);
    });
    if (editId) {
      setLoadingEdit(true);
      apiGet(`/api/handbook/articles/${editId}`).then(r => {
        if (r.status === 0) {
          const a = r.data;
          setTitle(a.title || ''); setSummary(a.summary || ''); setContent(a.content || '');
          setCoverPath(a.cover_path || ''); setTabId(String(a.tab_id || '')); setStatus(a.status || 'published');
        }
        setLoadingEdit(false);
      });
    }
  }, [editId]);

  const toggleTag = (slug: string) => {
    setTags(prev => prev.includes(slug) ? prev.filter(t => t !== slug) : [...prev, slug]);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    if (!title.trim()) return Alert.alert('请输入标题');
    if (!content.trim()) return Alert.alert('请输入内容');
    setSending(true);
    const body = { title: title.trim(), summary: summary.trim(), content: content.trim(), status, tab_id: tabId ? Number(tabId) : undefined, tags, cover_path: coverPath.trim() || undefined };
    try {
      const data = isEdit ? await apiPatch(`/api/handbook/articles/${editId}`, body) : await apiPost('/api/handbook/articles', body);
      if (data.status === 0) { Alert.alert(isEdit ? '保存成功' : '发布成功', '', [{ text: '好的', onPress: onDone }]); }
      else Alert.alert('失败', data.message);
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  if (loadingEdit) return <SafeAreaView style={st.bg} edges={['top']}><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={st.bg} edges={['top']}>
      <View style={st.header}><Pressable onPress={onBack}><Text style={st.back}>←</Text></Pressable><Text style={st.headerTitle}>{isEdit ? '编辑文章' : '写文章'}</Text><View style={{ width: 40 }} /></View>
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.label}>标题 *</Text>
        <TextInput style={st.input} value={title} onChangeText={setTitle} placeholder="文章标题" placeholderTextColor="#94a3b8" maxLength={200} />
        <Text style={st.label}>摘要</Text>
        <TextInput style={st.input} value={summary} onChangeText={setSummary} placeholder="文章摘要（可选）" placeholderTextColor="#94a3b8" maxLength={500} />
        <Text style={st.label}>内容 *（Markdown）</Text>
        <TextInput style={[st.input, st.textArea]} value={content} onChangeText={setContent} placeholder="支持 Markdown 格式..." placeholderTextColor="#94a3b8" multiline numberOfLines={10} textAlignVertical="top" />
        <Text style={st.label}>封面图片 URL</Text>
        <TextInput style={st.input} value={coverPath} onChangeText={setCoverPath} placeholder="https://...（可选）" placeholderTextColor="#94a3b8" />
        <Text style={st.label}>分区</Text>
        <View style={st.chipRow}>{tabOptions.filter((t: any) => t.slug !== 'all').map((t: any) => <Pressable key={t.id} style={[st.chip, tabId === String(t.id) && st.chipActive]} onPress={() => setTabId(String(t.id))}><Text style={[st.chipText, tabId === String(t.id) && st.chipTextActive]}>{t.name_zh || t.slug}</Text></Pressable>)}</View>
        <Text style={st.label}>标签</Text>
        <View style={st.chipRow}>{tagOptions.map((t: any) => <Pressable key={t.id} style={[st.chip, tags.includes(t.slug) && st.chipActive]} onPress={() => toggleTag(t.slug)}><Text style={[st.chipText, tags.includes(t.slug) && st.chipTextActive]}>{t.name_zh || t.slug}</Text></Pressable>)}</View>
        <View style={st.statusRow}>
          <Pressable style={[st.statusBtn, status === 'draft' && st.statusActive]} onPress={() => setStatus('draft')}><Text style={[st.statusText, status === 'draft' && st.statusTextActive]}>草稿</Text></Pressable>
          <Pressable style={[st.statusBtn, status === 'published' && st.statusActive]} onPress={() => setStatus('published')}><Text style={[st.statusText, status === 'published' && st.statusTextActive]}>发布</Text></Pressable>
        </View>
        <Pressable onPress={handleSubmit} disabled={sending} style={[st.submitBtn, sending && { opacity: 0.5 }]}>{sending ? <ActivityIndicator color="#fff" /> : <Text style={st.submitText}>{isEdit ? '保存' : '发布文章'}</Text>}</Pressable>
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
  textArea: { minHeight: 200 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  statusActive: { backgroundColor: '#0f172a' },
  statusText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  statusTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
