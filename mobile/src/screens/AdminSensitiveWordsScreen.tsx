import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';

export default function AdminSensitiveWordsScreen({ onBack }: { onBack: () => void }) {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [batchText, setBatchText] = useState('');

  const fetch = async () => {
    setLoading(true);
    const r = await apiGet('/api/admin/sensitive-words?pageSize=100');
    if (r.status === 0) setWords(r.data?.list || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const addWord = async () => {
    if (!newWord.trim()) return;
    const r = await apiPost('/api/admin/sensitive-words', { word: newWord.trim() });
    if (r.status === 0) { setNewWord(''); fetch(); Alert.alert('已添加'); }
    else Alert.alert('失败', r.message);
  };

  const batchImport = async () => {
    if (!batchText.trim()) return;
    const arr = batchText.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);
    if (arr.length === 0) return Alert.alert('无有效词语');
    const r = await apiPost('/api/admin/sensitive-words/batch', { words: arr });
    if (r.status === 0) { setBatchText(''); fetch(); Alert.alert(`已导入 ${arr.length} 个词`); }
    else Alert.alert('失败', r.message);
  };

  const toggleWord = async (id: number) => {
    await apiPatch(`/api/admin/sensitive-words/${id}/toggle`);
    fetch();
  };

  const deleteWord = async (id: number) => {
    await apiDelete(`/api/admin/sensitive-words/${id}`);
    fetch();
  };

  return (
    <View style={st.bg}>
      <View style={st.addRow}>
        <TextInput style={st.input} value={newWord} onChangeText={setNewWord} placeholder="添加敏感词" placeholderTextColor="#94a3b8" />
        <Pressable style={st.addBtn} onPress={addWord}><Text style={st.addText}>添加</Text></Pressable>
      </View>
      <View style={st.batchRow}>
        <TextInput style={[st.input, st.textArea]} value={batchText} onChangeText={setBatchText} placeholder="批量导入（换行或逗号分隔）" placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" />
        <Pressable style={st.batchBtn} onPress={batchImport}><Text style={st.addText}>导入</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 20 }} size="large" /> : (
        <FlatList data={words} keyExtractor={(w) => String(w.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={st.wordRow}>
              <View style={[st.dot, item.is_enabled ? st.dotOn : st.dotOff]} />
              <Text style={st.wordText}>{item.word}</Text>
              <Pressable onPress={() => toggleWord(item.id)}><Text style={{ color: '#2563eb', fontSize: 12 }}>{item.is_enabled ? '启用' : '停用'}</Text></Pressable>
              <Pressable onPress={() => deleteWord(item.id)}><Text style={{ color: '#ef4444', fontSize: 12, marginLeft: 10 }}>删除</Text></Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  addRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc', color: '#0f172a' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  batchRow: { padding: 10, gap: 8, backgroundColor: '#fff' },
  textArea: { minHeight: 60 },
  batchBtn: { paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
  wordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 4, gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#16a34a' }, dotOff: { backgroundColor: '#94a3b8' },
  wordText: { flex: 1, fontSize: 14, color: '#0f172a' },
});
