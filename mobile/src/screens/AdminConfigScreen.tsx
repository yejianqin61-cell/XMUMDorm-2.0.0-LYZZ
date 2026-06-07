import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet, apiPatch } from '../utils/http';

export default function AdminConfigScreen({ onBack }: { onBack: () => void }) {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [levelCfg, setLevelCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editable values
  const [hideTh, setHideTh] = useState('3');
  const [reviewTh, setReviewTh] = useState('10');
  const [delistTh, setDelistTh] = useState('5');
  const [levels, setLevels] = useState<number[]>([0, 100, 300, 800, 1800, 4000]);
  const [caps, setCaps] = useState<Record<string, number>>({ login: 5, like: 15, comment: 15, post: 30, cafeteria_review: 30 });
  const [rewards, setRewards] = useState<Record<string, number>>({ login: 5, like: 1, comment: 5, post: 10, cafeteria_review: 10 });

  useEffect(() => {
    Promise.all([apiGet('/api/admin/configs'), apiGet('/api/admin/level-config')]).then(([c, l]) => {
      if (c.status === 0) {
        const map: Record<string, string> = {};
        (c.data || []).forEach((r: any) => { map[r.config_key] = r.config_value; });
        setConfigs(map);
        setHideTh(map.report_auto_hide_threshold || '3');
        setReviewTh(map.report_auto_review_threshold || '10');
        setDelistTh(map.report_auto_delist_threshold || '5');
      }
      if (l.status === 0 && l.data) {
        setLevelCfg(l.data);
        if (l.data.level_thresholds) setLevels(Object.values(l.data.level_thresholds).slice(0, 6) as number[]);
        if (l.data.exp_daily_caps) setCaps(l.data.exp_daily_caps);
        if (l.data.exp_action_rewards) setRewards(l.data.exp_action_rewards);
      }
      setLoading(false);
    });
  }, []);

  const saveConfig = async (key: string, value: string) => {
    const r = await apiPatch(`/api/admin/configs/${key}`, { config_value: value });
    Alert.alert(r.status === 0 ? '已保存' : '保存失败');
  };

  const saveLevelConfig = async () => {
    const r = await apiPatch('/api/admin/level-config', { level_thresholds: levels, exp_daily_caps: caps, exp_action_rewards: rewards });
    Alert.alert(r.status === 0 ? '已保存' : '保存失败');
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" />;

  return (
    <ScrollView contentContainerStyle={st.body}>
      <Text style={st.sectionTitle}>举报规则</Text>
      <View style={st.configRow}>
        <Text style={st.configLabel}>自动隐藏阈值</Text>
        <TextInput style={st.configInput} value={hideTh} onChangeText={setHideTh} keyboardType="numeric" />
        <Pressable style={st.saveBtn} onPress={() => saveConfig('report_auto_hide_threshold', hideTh)}><Text style={st.saveText}>保存</Text></Pressable>
      </View>
      <View style={st.configRow}>
        <Text style={st.configLabel}>审核队列阈值</Text>
        <TextInput style={st.configInput} value={reviewTh} onChangeText={setReviewTh} keyboardType="numeric" />
        <Pressable style={st.saveBtn} onPress={() => saveConfig('report_auto_review_threshold', reviewTh)}><Text style={st.saveText}>保存</Text></Pressable>
      </View>
      <View style={st.configRow}>
        <Text style={st.configLabel}>自动下架阈值</Text>
        <TextInput style={st.configInput} value={delistTh} onChangeText={setDelistTh} keyboardType="numeric" />
        <Pressable style={st.saveBtn} onPress={() => saveConfig('report_auto_delist_threshold', delistTh)}><Text style={st.saveText}>保存</Text></Pressable>
      </View>

      <Text style={[st.sectionTitle, { marginTop: 20 }]}>等级阈值（Lv1~Lv6 所需 EXP）</Text>
      {levels.map((lv, i) => (
        <View key={i} style={st.configRow}>
          <Text style={st.configLabel}>Lv.{i + 1}</Text>
          <TextInput style={st.configInput} value={String(lv)} onChangeText={(v) => { const n = [...levels]; n[i] = Number(v) || 0; setLevels(n); }} keyboardType="numeric" />
        </View>
      ))}
      <Pressable style={st.mainSave} onPress={saveLevelConfig}><Text style={st.mainSaveText}>保存等级配置</Text></Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  body: { padding: 14, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  configRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  configLabel: { flex: 1, fontSize: 14, color: '#334155' },
  configInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 70, textAlign: 'center', color: '#0f172a', backgroundColor: '#f8fafc' },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0f172a' },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mainSave: { marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center' },
  mainSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
