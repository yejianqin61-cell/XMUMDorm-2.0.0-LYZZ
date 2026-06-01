import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPost, apiPatch } from '../api/client';

const ORG_TYPES = [
  { key: 'SchoolDepartment', label: '学校部门' },
  { key: 'College', label: '学院' },
  { key: 'Official', label: '官方号' },
];

export default function AdminOrgListScreen({ onBack, onMembers }: { onBack: () => void; onMembers: (id: number, name: string) => void }) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('SchoolDepartment');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('type', typeFilter);
    const r = await apiGet(`/api/organizations?${params.toString()}`);
    if (r.status === 0) setOrgs(r.data || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, [typeFilter]);

  const openEdit = (org: any) => {
    setEditId(org.id); setFormName(org.name); setFormType(org.type); setFormDesc(org.description || '');
    setShowForm(true);
  };
  const openCreate = () => {
    setEditId(null); setFormName(''); setFormType('SchoolDepartment'); setFormDesc('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return Alert.alert('请输入组织名称');
    setSubmitting(true);
    const body = { name: formName.trim(), type: formType, description: formDesc.trim() };
    const r = editId ? await apiPatch(`/api/organizations/${editId}`, body) : await apiPost('/api/organizations', body);
    if (r.status === 0) { setShowForm(false); fetch(); }
    else Alert.alert('失败', r.message);
    setSubmitting(false);
  };

  return (
    <View style={st.bg}>
      <View style={st.filterRow}>
        {[{ key: 'all', label: '全部' }, ...ORG_TYPES].map((t) => (
          <Pressable key={t.key} style={[st.chip, typeFilter === t.key && st.chipActive]} onPress={() => setTypeFilter(t.key)}>
            <Text style={[st.chipText, typeFilter === t.key && st.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={st.addBtn} onPress={openCreate}><Text style={st.addText}>+ 新建组织</Text></Pressable>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList data={orgs} keyExtractor={(o) => String(o.id)} contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={st.card}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{item.name}</Text>
                <Text style={st.meta}>{ORG_TYPES.find((t) => t.key === item.type)?.label || item.type} · {item.is_active ? '活跃' : '停用'}</Text>
              </View>
              <Pressable style={st.membersBtn} onPress={() => onMembers(item.id, item.name)}><Text style={st.membersText}>成员</Text></Pressable>
              <Pressable style={st.editBtn} onPress={() => openEdit(item)}><Text style={st.editText}>编辑</Text></Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={st.modalBg}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>{editId ? '编辑组织' : '新建组织'}</Text>
            <TextInput style={st.input} value={formName} onChangeText={setFormName} placeholder="名称" placeholderTextColor="#94a3b8" maxLength={100} />
            <View style={st.typeRow}>
              {ORG_TYPES.map((t) => (
                <Pressable key={t.key} style={[st.typeChip, formType === t.key && st.typeActive]} onPress={() => setFormType(t.key)}>
                  <Text style={[st.typeText, formType === t.key && st.typeTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={[st.input, st.textArea]} value={formDesc} onChangeText={setFormDesc} placeholder="简介（可选）" placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" />
            <View style={st.modalBtns}>
              <Pressable onPress={() => setShowForm(false)} style={st.cancelBtn}><Text style={{ color: '#64748b', fontWeight: '600' }}>取消</Text></Pressable>
              <Pressable onPress={handleSubmit} disabled={submitting} style={st.submitBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? '...' : '保存'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  addBtn: { margin: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center' },
  addText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  membersBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },
  membersText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  editText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  modalBg: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 10 },
  textArea: { minHeight: 80 },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  typeActive: { backgroundColor: '#0f172a' },
  typeText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  typeTextActive: { color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  submitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
});
