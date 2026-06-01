import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';

const MOODS = ['🍃', '☀️', '✨', '🌧️', '🌙', '🫶', '😵‍💫', '😌'];
const HEAT_LEVELS = [
  { max: 0, bg: 'rgba(255,255,255,0.6)' },
  { max: 29, bg: 'rgba(234,179,8,0.18)' },
  { max: 119, bg: 'rgba(234,179,8,0.28)' },
  { max: 259, bg: 'rgba(234,179,8,0.40)' },
  { max: Infinity, bg: 'rgba(234,179,8,0.52)' },
];

function fmtDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtLabel(d: Date) { return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`; }

export default function DiaryScreen({ onBack }: { onBack: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState('');
  const [hasDiary, setHasDiary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState('');
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [heatMap, setHeatMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const realToday = useRef(new Date());
  const { isLoggedIn } = useAuth();

  const dateStr = fmtDate(currentDate);

  const loadDay = useCallback(async () => {
    setLoading(true);
    const r = await apiGet(`/api/diary/day?date=${dateStr}`);
    if (r.status === 0) {
      setContent(r.data?.content || '');
      setHasDiary(!!r.data?.content);
    }
    setLoading(false);
  }, [dateStr]);

  const loadOverview = useCallback(async () => {
    const r = await apiGet(`/api/diary/overview?date=${dateStr}&recentDays=5`);
    if (r.status === 0) {
      const past = (r.data?.sameDayPastYears || []).filter((d: any) => d.hasDiary);
      setBubbles(past);
    }
  }, [dateStr]);

  const loadMonthHeat = useCallback(async (year: number, month: number) => {
    const r = await apiGet(`/api/diary/month?year=${year}&month=${month}`);
    if (r.status === 0) {
      const map = new Map<string, number>();
      (r.data || []).forEach((d: any) => map.set(d.date, d.len));
      setHeatMap(map);
    }
  }, []);

  useEffect(() => { if (isLoggedIn) { loadDay(); loadOverview(); } }, [loadDay]);
  useEffect(() => { if (showCalendar) loadMonthHeat(calYear, calMonth); }, [calYear, calMonth, showCalendar]);

  const handleSave = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    setSaving(true);
    const r = await apiPost('/api/diary/day', { date: dateStr, content });
    if (r.status === 0) { setHasDiary(true); Alert.alert('已保存'); }
    setSaving(false);
  };

  const changeDay = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getHeatColor = (day: number) => {
    const key = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const len = heatMap.get(key) || 0;
    for (const lv of HEAT_LEVELS) { if (len <= lv.max) return lv.bg; }
    return HEAT_LEVELS[0].bg;
  };

  const isToday = dateStr === fmtDate(realToday.current);

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>多年日记</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Date selector */}
        <View style={s.dateRow}>
          <Pressable onPress={() => changeDay(-1)}><Text style={s.arrow}>‹</Text></Pressable>
          <Pressable onPress={() => setShowCalendar(true)}>
            <Text style={s.dateText}>{fmtLabel(currentDate)}</Text>
            {!isToday && <Text style={s.todayHint}>（点击回到今天）</Text>}
          </Pressable>
          <Pressable onPress={() => changeDay(1)}><Text style={s.arrow}>›</Text></Pressable>
          {!isToday && <Pressable onPress={goToday} style={s.todayBtn}><Text style={s.todayBtnText}>今天</Text></Pressable>}
        </View>

        {/* Memory bubbles */}
        {bubbles.length > 0 && (
          <View style={s.bubbleSection}>
            <Text style={s.bubbleTitle}>💭 往年今日</Text>
            <View style={s.bubbleRow}>
              {bubbles.map((b: any) => (
                <Pressable key={b.year} style={s.bubble} onPress={async () => {
                  const r = await apiGet(`/api/diary/day?date=${b.date}`);
                  if (r.status === 0 && r.data?.content) Alert.alert(`${b.year}年的今天`, r.data.content);
                  else Alert.alert(`${b.year}`, '那年今天没有留下文字');
                }}>
                  <Text style={s.bubbleYear}>{b.year}</Text>
                  <Text style={s.bubbleDot}>💭</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Editor */}
        <View style={s.editorCard}>
          <View style={s.editorHeader}>
            <Text style={s.charCount}>{content.length} 字</Text>
            <Pressable onPress={handleSave} disabled={saving} style={s.saveBtn}>
              <Text style={s.saveText}>{saving ? '...' : '💾 保存'}</Text>
            </Pressable>
          </View>
          <TextInput
            style={s.textarea}
            value={content}
            onChangeText={setContent}
            placeholder="这里很安全，慢慢写。"
            placeholderTextColor="#cbd5e1"
            multiline
            textAlignVertical="top"
          />
          {/* Mood picker */}
          <View style={s.moodRow}>
            {MOODS.map((m) => (
              <Pressable key={m} style={[s.moodBtn, mood === m && s.moodActive]} onPress={() => setMood(mood === m ? '' : m)}>
                <Text style={s.moodEmoji}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.calCard}>
            <View style={s.calHeader}>
              <Pressable onPress={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>
                <Text style={s.calNav}>‹</Text>
              </Pressable>
              <Text style={s.calTitle}>{calYear}.{String(calMonth).padStart(2,'0')}</Text>
              <Pressable onPress={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>
                <Text style={s.calNav}>›</Text>
              </Pressable>
            </View>
            <View style={s.calDow}>
              {['日','一','二','三','四','五','六'].map((d) => <Text key={d} style={s.dow}>{d}</Text>)}
            </View>
            <View style={s.calGrid}>
              {calendarDays.map((d, i) => (
                <Pressable key={i} style={[s.calDay, d && { backgroundColor: getHeatColor(d) }, d && fmtDate(new Date(calYear, calMonth - 1, d)) === dateStr && s.calActive]}
                  onPress={() => { if (d) { setCurrentDate(new Date(calYear, calMonth - 1, d)); setShowCalendar(false); } }}
                >
                  <Text style={s.calDayText}>{d || ''}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowCalendar(false)} style={s.calClose}>
              <Text style={s.calCloseText}>关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#faf9f7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 40 },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  arrow: { fontSize: 28, color: '#94a3b8', fontWeight: '300' },
  dateText: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  todayHint: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9' },
  todayBtnText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  bubbleSection: { marginBottom: 16 },
  bubbleTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  bubbleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  bubble: { backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', minWidth: 64, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bubbleYear: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  bubbleDot: { fontSize: 16, marginTop: 2 },

  editorCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  charCount: { fontSize: 12, color: '#94a3b8' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, backgroundColor: '#0f172a' },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  textarea: { minHeight: 300, fontSize: 16, color: '#334155', lineHeight: 26, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textAlignVertical: 'top' },

  moodRow: { flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center' },
  moodBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f8fafc' },
  moodActive: { backgroundColor: '#dbeafe' },
  moodEmoji: { fontSize: 20 },

  modalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  calCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: 320 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calNav: { fontSize: 22, color: '#0f172a', fontWeight: '600' },
  calTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  calDow: { flexDirection: 'row', marginBottom: 6 },
  dow: { flex: 1, textAlign: 'center', fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calActive: { borderWidth: 2, borderColor: '#6366f1' },
  calDayText: { fontSize: 13, color: '#334155' },
  calClose: { alignItems: 'center', marginTop: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9' },
  calCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
});
