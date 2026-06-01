import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Modal, Alert,
  StyleSheet, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';
import {
  requestReminderPermission,
  scheduleAllReminders,
  cancelAllReminders,
  hasScheduledReminders,
} from '../services/scheduleReminder';
import { fmtClock } from '../utils';

const CACHE_KEY = 'dorm_schedule_cache_v1_w1';
const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getTodayDow(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d; // JS Sun=0 → our Sun=7
}


function addFreeSlots(courses: any[]): any[] {
  if (!courses || courses.length === 0) return courses || [];
  const result: any[] = [];
  for (let i = 0; i < courses.length; i++) {
    result.push(courses[i]);
    if (i < courses.length - 1) {
      const currEnd = courses[i].end_time;
      const nextStart = courses[i + 1].start_time;
      if (currEnd && nextStart) {
        const gap = (parseInt(nextStart) * 60 + parseInt(nextStart.substring(3, 5))) -
          (parseInt(currEnd) * 60 + parseInt(currEnd.substring(3, 5)));
        if (gap >= 25) {
          result.push({ _freeSlot: true, start_time: currEnd, end_time: nextStart, duration: gap });
        }
      }
    }
  }
  return result;
}

export default function ScheduleScreen({ onBack }: { onBack: () => void }) {
  const [days, setDays] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [reminderOn, setReminderOn] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const { isLoggedIn } = useAuth();
  const todayDow = getTodayDow();

  const loadWeek = useCallback(async () => {
    setLoading(true);
    // Try cache first
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setDays(JSON.parse(cached)); setLoading(false); } catch {}
    }
    // Fetch from API
    const r = await apiGet('/api/schedule/week?week=1');
    if (r.status === 0 && r.data?.days) {
      setDays(r.data.days);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(r.data.days));
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoggedIn) { loadWeek(); checkReminderStatus(); } }, [loadWeek]);

  const checkReminderStatus = async () => {
    const has = await hasScheduledReminders();
    setReminderOn(has);
  };

  const toggleReminder = async (val: boolean) => {
    if (val) {
      const granted = await requestReminderPermission();
      if (!granted) { Alert.alert('权限未开启', '请在系统设置中开启通知权限'); return; }
      // Schedule reminders for all meetings
      const allMeetings: any[] = [];
      Object.values(days).forEach((dayCourses: any) => {
        (dayCourses || []).forEach((c: any) => {
          if (!c._freeSlot) allMeetings.push(c);
        });
      });
      if (allMeetings.length === 0) { Alert.alert('暂无课程', '请先导入课表'); return; }
      const count = await scheduleAllReminders(allMeetings);
      Alert.alert('已开启', `已为 ${count} 节课设置课前提醒`);
      setReminderOn(true);
    } else {
      await cancelAllReminders();
      setReminderOn(false);
      Alert.alert('已关闭', '课前提醒已关闭');
    }
  };

  const handlePreview = async () => {
    if (importText.length < 10) { Alert.alert('文本太短', '请粘贴完整的课程表文本'); return; }
    setImporting(true);
    const r = await apiPost('/api/schedule/import/preview', { text: importText });
    if (r.status === 0) setImportPreview(r.data);
    else Alert.alert('解析失败', r.message);
    setImporting(false);
  };

  const handleCommit = async () => {
    setImporting(true);
    const r = await apiPost('/api/schedule/import/commit', { text: importText });
    if (r.status === 0) {
      Alert.alert('导入成功', `${r.data?.stats?.courseCount || 0} 门课, ${r.data?.stats?.meetingCount || 0} 个时间段`, [
        { text: '好的', onPress: () => { setImportOpen(false); setImportText(''); setImportPreview(null); loadWeek(); } },
        {
          text: '开启课前提醒',
          onPress: () => { setImportOpen(false); setImportText(''); setImportPreview(null); loadWeek(); toggleReminder(true); },
        },
      ]);
    } else Alert.alert('导入失败', r.message);
    setImporting(false);
  };

  // Order days: today first, then rest
  const dayOrder = [todayDow, ...[1, 2, 3, 4, 5, 6, 7].filter((d) => d !== todayDow)];

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>课程表</Text>
        <Pressable onPress={() => setImportOpen(true)}><Text style={s.importBtn}>+ 导入</Text></Pressable>
      </View>

      {/* Reminder toggle */}
      <View style={s.reminderBar}>
        <Text style={s.reminderLabel}>🔔 课前提醒（提前30分钟）</Text>
        <Switch value={reminderOn} onValueChange={toggleReminder} trackColor={{ false: '#e2e8f0', true: '#6366f1' }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 60 }} size="large" /> : (
        <ScrollView contentContainerStyle={s.body}>
          {dayOrder.map((dow) => {
            const dayCourses = days[dow] || [];
            const items = addFreeSlots(dayCourses);
            const isToday = dow === todayDow;

            return (
              <View key={dow} style={[s.dayCard, isToday && s.todayCard]}>
                <View style={s.dayHeader}>
                  <Text style={[s.dayTitle, isToday && s.todayTitle]}>{DAY_LABELS[dow]}</Text>
                  {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeText}>今天</Text></View>}
                </View>

                {items.length === 0 ? (
                  <Text style={s.emptyDay}>🐶 今天没课～</Text>
                ) : (
                  items.map((item: any, idx: number) => {
                    if (item._freeSlot) {
                      return (
                        <View key={`free_${idx}`} style={s.freeSlot}>
                          <Text style={s.freeIcon}>{idx % 2 === 0 ? '☕' : '📖'}</Text>
                          <Text style={s.freeText}>空档 {fmtClock(item.start_time)}-{fmtClock(item.end_time)}</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={item.course_code + '_' + idx} style={s.courseItem}>
                        <View style={s.courseAccent} />
                        <View style={s.courseTime}>
                          <Text style={s.timeStart}>{fmtClock(item.start_time)}</Text>
                          <Text style={s.timeEnd}>{fmtClock(item.end_time)}</Text>
                        </View>
                        <View style={s.courseInfo}>
                          <Text style={s.courseName}>{item.course_name}</Text>
                          <View style={s.courseMeta}>
                            {item.venue ? <Text style={s.courseVenue}>📍 {item.venue}</Text> : null}
                            <Text style={s.courseCode}>{item.course_code}</Text>
                            {item.lecturer ? <Text style={s.courseLecturer}>👨‍🏫 {item.lecturer}</Text> : null}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Import Modal */}
      <Modal visible={importOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.bg} edges={['top']}>
          <View style={s.header}>
            <Pressable onPress={() => { setImportOpen(false); setImportText(''); setImportPreview(null); }}>
              <Text style={s.back}>取消</Text>
            </Pressable>
            <Text style={s.headerTitle}>导入课表</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={s.importBody}>
            <Text style={s.importHint}>1. 进入学校 AC 系统{'\n'}2. 进入 Course List{'\n'}3. 全选表格（Ctrl+A / 长按全选）{'\n'}4. 复制并粘贴到下方</Text>
            <TextInput
              style={s.importInput}
              value={importText}
              onChangeText={setImportText}
              placeholder="粘贴课程表文本..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />

            {importPreview && (
              <View style={s.previewBox}>
                <Text style={s.previewTitle}>解析结果</Text>
                <Text style={s.previewStat}>📚 {importPreview.stats?.courseCount || 0} 门课</Text>
                <Text style={s.previewStat}>🕐 {importPreview.stats?.meetingCount || 0} 个时间段</Text>
                {importPreview.errors?.length > 0 && (
                  <Text style={s.previewErr}>⚠️ {importPreview.errors.length} 个警告</Text>
                )}
              </View>
            )}

            <View style={s.importBtnRow}>
              <Pressable onPress={handlePreview} disabled={importing} style={[s.importAction, s.previewBtn]}>
                <Text style={s.importActionText}>预览</Text>
              </Pressable>
              <Pressable onPress={handleCommit} disabled={importing} style={[s.importAction, s.commitBtn]}>
                {importing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.importActionText, { color: '#fff' }]}>导入</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  importBtn: { fontSize: 14, color: '#2563eb', fontWeight: '700' },

  reminderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  reminderLabel: { fontSize: 13, color: '#334155', fontWeight: '600' },

  body: { padding: 12, paddingBottom: 40 },

  dayCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  todayCard: { backgroundColor: '#ecfdf5', borderWidth: 1.5, borderColor: '#4ade80' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  todayTitle: { color: '#065f46' },
  todayBadge: { backgroundColor: '#4ade80', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  todayBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  courseItem: { flexDirection: 'row', marginBottom: 10, paddingLeft: 8 },
  courseAccent: { width: 3, backgroundColor: '#6366f1', borderRadius: 2, marginRight: 10 },
  courseTime: { width: 64, marginRight: 10 },
  timeStart: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 11, color: '#94a3b8', fontVariant: ['tabular-nums'] },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  courseMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseVenue: { fontSize: 11, color: '#64748b' },
  courseCode: { fontSize: 11, color: '#94a3b8' },
  courseLecturer: { fontSize: 11, color: '#94a3b8' },

  freeSlot: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 21, gap: 8 },
  freeIcon: { fontSize: 14 },
  freeText: { fontSize: 12, color: '#94a3b8' },

  emptyDay: { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 10 },

  // Import Modal
  importBody: { padding: 16, paddingBottom: 40 },
  importHint: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 14, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10 },
  importInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 13, color: '#0f172a', backgroundColor: '#fff', minHeight: 200, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  previewBox: { marginTop: 14, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  previewStat: { fontSize: 13, color: '#334155', marginBottom: 2 },
  previewErr: { fontSize: 13, color: '#f59e0b', marginTop: 4 },
  importBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  importAction: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  previewBtn: { backgroundColor: '#f1f5f9' },
  commitBtn: { backgroundColor: '#0f172a' },
  importActionText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
});
