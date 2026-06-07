import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPatch } from '../utils/http';

const TAG_OPTIONS = ['MPU', 'GE', 'ME', 'required', 'final', 'no final'];
const TAG_LABELS: Record<string, string> = { MPU: 'MPU', GE: 'GE', ME: 'ME', required: '必修', final: '有期末', 'no final': '无期末' };
const YEARS = Array.from({ length: 11 }, (_, i) => 2016 + i); // 2016-2026
const MONTHS = ['02', '04', '09'];

export default function CourseReviewCreateScreen({ editId, onBack, onDone }: { editId?: number; onBack: () => void; onDone: () => void }) {
  const isEdit = !!editId;
  const [courseName, setCourseName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [rating, setRating] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [termYear, setTermYear] = useState(new Date().getFullYear());
  const [termMonth, setTermMonth] = useState('09');
  const [sending, setSending] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      apiGet(`/api/handbook/course-reviews/${editId}`).then(r => {
        if (r.status === 0) {
          const d = r.data;
          setCourseName(d.course_name || ''); setTeacher(d.teacher || ''); setRating(d.rating || 0);
          setDifficulty(d.difficulty || 0); setComment(d.comment || ''); setTags(d.tags || []);
          if (d.term_year) setTermYear(d.term_year); if (d.term_month) setTermMonth(d.term_month);
        }
        setLoadingEdit(false);
      });
    }
  }, [editId]);

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    if (!courseName.trim()) return Alert.alert('请输入课程名称');
    if (!teacher.trim()) return Alert.alert('请输入教师名称');
    if (!rating) return Alert.alert('请选择评分');
    if (!difficulty) return Alert.alert('请选择难度');
    if (tags.length === 0) return Alert.alert('请至少选择一个标签');
    setSending(true);
    const body = { courseName: courseName.trim(), teacher: teacher.trim(), rating, difficulty, comment: comment.trim(), tags, termYear, termMonth };
    try {
      const data = isEdit ? await apiPatch(`/api/handbook/course-reviews/${editId}`, body) : await apiPost('/api/handbook/course-reviews', body);
      if (data.status === 0) { Alert.alert(isEdit ? '保存成功' : '发布成功', '', [{ text: '好的', onPress: onDone }]); }
      else Alert.alert('失败', data.message);
    } catch { Alert.alert('网络错误'); }
    setSending(false);
  };

  if (loadingEdit) return <SafeAreaView style={st.bg} edges={['top']}><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={st.bg} edges={['top']}>
      <View style={st.header}><Pressable onPress={onBack}><Text style={st.back}>←</Text></Pressable><Text style={st.headerTitle}>{isEdit ? '编辑评价' : '写评价'}</Text><View style={{ width: 40 }} /></View>
      <ScrollView contentContainerStyle={st.body}>
        <Text style={st.label}>课程名称 *</Text>
        <TextInput style={st.input} value={courseName} onChangeText={setCourseName} placeholder="例如：Calculus" placeholderTextColor="#94a3b8" maxLength={180} />
        <Text style={st.label}>教师 *</Text>
        <TextInput style={st.input} value={teacher} onChangeText={setTeacher} placeholder="教师姓名" placeholderTextColor="#94a3b8" maxLength={120} />

        <View style={st.row2}>
          <View style={{ flex: 1 }}><Text style={st.label}>评分 *</Text>
            <View style={st.starRow}>{[1,2,3,4,5].map(n => <Pressable key={n} onPress={() => setRating(n)}><Text style={[st.star, n <= rating && st.starActive]}>{n <= rating ? '★' : '☆'}</Text></Pressable>)}</View>
          </View>
          <View style={{ flex: 1 }}><Text style={st.label}>难度 *</Text>
            <View style={st.starRow}>{[1,2,3,4,5].map(n => <Pressable key={n} onPress={() => setDifficulty(n)}><Text style={[st.diffStar, n <= difficulty && st.diffActive]}>{n <= difficulty ? '🔴' : '⚪'}</Text></Pressable>)}</View>
          </View>
        </View>

        <Text style={st.label}>学期</Text>
        <View style={st.row2}>
          <View style={{ flex: 1 }}><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 4 }}>{YEARS.map(y => <Pressable key={y} style={[st.chip, termYear === y && st.chipActive]} onPress={() => setTermYear(y)}><Text style={[st.chipText, termYear === y && st.chipTextActive]}>{y}</Text></Pressable>)}</View></ScrollView></View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{MONTHS.map(m => <Pressable key={m} style={[st.chip, termMonth === m && st.chipActive]} onPress={() => setTermMonth(m)}><Text style={[st.chipText, termMonth === m && st.chipTextActive]}>{m}月</Text></Pressable>)}</View>
        </View>

        <Text style={st.label}>标签 *</Text>
        <View style={st.chipRow}>{TAG_OPTIONS.map(t => <Pressable key={t} style={[st.chip, tags.includes(t) && st.chipActive]} onPress={() => toggleTag(t)}><Text style={[st.chipText, tags.includes(t) && st.chipTextActive]}>{TAG_LABELS[t]}</Text></Pressable>)}</View>

        <Text style={st.label}>评论</Text>
        <TextInput style={[st.input, st.textArea]} value={comment} onChangeText={setComment} placeholder="分享你的上课体验..." placeholderTextColor="#94a3b8" multiline numberOfLines={5} textAlignVertical="top" maxLength={3000} />

        <Pressable onPress={handleSubmit} disabled={sending} style={[st.submitBtn, sending && { opacity: 0.5 }]}>{sending ? <ActivityIndicator color="#fff" /> : <Text style={st.submitText}>{isEdit ? '保存' : '发布评价'}</Text>}</Pressable>
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
  textArea: { minHeight: 120 },
  row2: { flexDirection: 'row', gap: 10 },
  starRow: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 24, color: '#e2e8f0' },
  starActive: { color: '#f59e0b' },
  diffStar: { fontSize: 18, color: '#e2e8f0' },
  diffActive: { color: '#ef4444' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
