import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';

const LIST_TYPES = [
  { key: 'all', label: '全部' },
  { key: 'personal', label: '个人' },
  { key: 'course', label: '课程' },
  { key: 'club', label: '社团' },
  { key: 'other', label: '其他' },
];

const STATUS_FILTERS = [
  { key: 'active', label: '进行中' },
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
];

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '无', color: '#94a3b8' },
  1: { label: '低', color: '#16a34a' },
  2: { label: '中', color: '#f59e0b' },
  3: { label: '高', color: '#ef4444' },
};

const TYPE_LABELS: Record<string, string> = { personal: '个人', course: '课程', club: '社团', other: '其他' };

function fmtDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

export default function TodoScreen({ onBack }: { onBack: () => void }) {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [formType, setFormType] = useState('personal');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isLoggedIn } = useAuth();
  const today = fmtDateStr(new Date());

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (typeFilter !== 'all') params.set('list_type', typeFilter);
    if (statusFilter === 'active') params.set('status', 'active');
    if (statusFilter === 'completed') params.set('status', 'completed');
    const r = await apiGet(`/api/todos?${params.toString()}`);
    if (r.status === 0) setTodos(r.data?.list || []);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => { if (isLoggedIn) fetchTodos(); }, [fetchTodos]);

  const openCreate = () => {
    setEditId(null);
    setFormTitle(''); setFormDesc(''); setFormPriority(0); setFormType('personal');
    setFormDueDate(''); setFormDueTime('');
    setShowForm(true);
  };

  const openEdit = (todo: any) => {
    setEditId(todo.id);
    setFormTitle(todo.title || '');
    setFormDesc(todo.description || '');
    setFormPriority(todo.priority || 0);
    setFormType(todo.list_type || 'personal');
    setFormDueDate(todo.due_date || '');
    setFormDueTime(todo.due_time ? todo.due_time.substring(0, 5) : '');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) return Alert.alert('请输入标题');
    setSubmitting(true);
    const body: any = { title: formTitle.trim(), description: formDesc.trim(), priority: formPriority, list_type: formType };
    if (formDueDate) body.due_date = formDueDate;
    if (formDueTime) body.due_time = formDueTime;
    try {
      const r = editId ? await apiPatch(`/api/todos/${editId}`, body) : await apiPost('/api/todos', body);
      if (r.status === 0) { setShowForm(false); fetchTodos(); }
      else Alert.alert('失败', r.message);
    } catch { Alert.alert('网络错误'); }
    setSubmitting(false);
  };

  const handleToggle = async (todo: any) => {
    const r = await apiPatch(`/api/todos/${todo.id}/toggle`);
    if (r.status === 0) fetchTodos();
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { await apiDelete(`/api/todos/${id}`); fetchTodos(); } },
    ]);
  };

  const isOverdue = (todo: any) => todo.due_date && todo.due_date < today && !todo.is_completed;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>待办事项</Text>
        <Pressable onPress={openCreate}><Text style={s.addBtn}>+ 添加</Text></Pressable>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {LIST_TYPES.map((t) => (
          <Pressable key={t.key} style={[s.chip, typeFilter === t.key && s.chipActive]} onPress={() => setTypeFilter(t.key)}>
            <Text style={[s.chipText, typeFilter === t.key && s.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.filterRow}>
        {STATUS_FILTERS.map((st) => (
          <Pressable key={st.key} style={[s.chip, statusFilter === st.key && s.chipActive]} onPress={() => setStatusFilter(st.key)}>
            <Text style={[s.chipText, statusFilter === st.key && s.chipTextActive]}>{st.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Form */}
      {showForm && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>{editId ? '编辑' : '新建'}待办</Text>
          <TextInput style={s.input} value={formTitle} onChangeText={setFormTitle} placeholder="标题 *" placeholderTextColor="#94a3b8" maxLength={500} />
          <TextInput style={[s.input, s.textArea]} value={formDesc} onChangeText={setFormDesc} placeholder="描述（可选）" placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" />
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>优先级</Text>
              <View style={s.prioRow}>
                {[0,1,2,3].map((p) => (
                  <Pressable key={p} style={[s.prioBtn, formPriority === p && { backgroundColor: PRIORITY_LABELS[p].color }]} onPress={() => setFormPriority(p)}>
                    <Text style={[s.prioText, formPriority === p && { color: '#fff' }]}>{PRIORITY_LABELS[p].label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={s.formRow}>
            <View style={{ flex: 1 }}><Text style={s.fLabel}>类型</Text>
              <View style={s.prioRow}>
                {['personal','course','club','other'].map((tp) => (
                  <Pressable key={tp} style={[s.prioBtn, formType === tp && s.prioBtnActive]} onPress={() => setFormType(tp)}>
                    <Text style={[s.prioText, formType === tp && { color: '#fff' }]}>{TYPE_LABELS[tp]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={s.formRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={formDueDate} onChangeText={setFormDueDate} placeholder="截止日期 YYYY-MM-DD" placeholderTextColor="#94a3b8" />
            <TextInput style={[s.input, { flex: 1 }]} value={formDueTime} onChangeText={setFormDueTime} placeholder="时间 HH:mm" placeholderTextColor="#94a3b8" />
          </View>
          <View style={s.formActions}>
            <Pressable onPress={() => setShowForm(false)} style={s.cancelBtn}><Text style={s.cancelText}>取消</Text></Pressable>
            <Pressable onPress={handleSubmit} disabled={submitting} style={s.submitBtn}><Text style={s.submitText}>{submitting ? '...' : '保存'}</Text></Pressable>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={todos}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable style={[s.todoCard, isOverdue(item) && s.overdueCard]} onPress={() => openEdit(item)}>
              <Pressable onPress={() => handleToggle(item)} style={[s.checkbox, item.is_completed && s.checkboxDone]}>
                {item.is_completed && <Text style={s.checkmark}>✓</Text>}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[s.todoTitle, item.is_completed && s.todoDone]}>{item.title}</Text>
                {item.description ? <Text style={s.todoDesc} numberOfLines={1}>{item.description}</Text> : null}
                <View style={s.todoMeta}>
                  {item.priority > 0 && <Text style={[s.prioTag, { color: PRIORITY_LABELS[item.priority]?.color }]}>{PRIORITY_LABELS[item.priority]?.label}优先</Text>}
                  <Text style={s.typeTag}>{TYPE_LABELS[item.list_type]}</Text>
                  {item.due_date && <Text style={[s.due, isOverdue(item) && { color: '#ef4444' }]}>{item.due_date}{item.due_time ? ` ${item.due_time.substring(0,5)}` : ''}</Text>}
                </View>
              </View>
              <Pressable onPress={() => handleDelete(item.id)}><Text style={s.delBtn}>🗑</Text></Pressable>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无待办事项</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addBtn: { fontSize: 14, color: '#2563eb', fontWeight: '700' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  formCard: { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 8 },
  textArea: { minHeight: 80 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  fLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  prioRow: { flexDirection: 'row', gap: 4 },
  prioBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f1f5f9' },
  prioBtnActive: { backgroundColor: '#0f172a' },
  prioText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  todoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, gap: 10 },
  overdueCard: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  todoTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  todoDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  todoDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  todoMeta: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  prioTag: { fontSize: 10, fontWeight: '700' },
  typeTag: { fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  due: { fontSize: 10, color: '#94a3b8' },
  delBtn: { fontSize: 14 },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
