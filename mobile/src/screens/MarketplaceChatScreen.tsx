import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Alert,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/http';
import { fmtClock } from '../utils';

interface Props { threadId?: number; itemId?: number; onBack: () => void; }

export default function MarketplaceChatScreen({ threadId: initialThreadId, itemId, onBack }: Props) {
  const [mode, setMode] = useState<'chat' | 'threads'>('chat');
  const [threadId, setThreadId] = useState<number | null>(initialThreadId || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemTitle, setItemTitle] = useState('');
  const flatRef = useRef<FlatList>(null);
  const { user } = useAuth();

  // Polling
  useEffect(() => {
    if (!threadId || mode !== 'chat') return;
    const load = async () => {
      const r = await apiGet(`/api/marketplace/chat/threads/${threadId}/messages`);
      if (r.status === 0) {
        setMessages(r.data?.list || []);
        setItemTitle(r.data?.thread?.item_title || '');
      }
      if (loading) setLoading(false);
    };
    load();
    apiPost(`/api/marketplace/chat/threads/${threadId}/read`);
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [threadId, mode]);

  // Load threads list
  useEffect(() => {
    if (mode !== 'threads' || !itemId) return;
    const load = async () => {
      const r = await apiGet(`/api/marketplace/items/${itemId}/chat/threads`);
      if (r.status === 0) {
        setThreads(r.data?.list || []);
        setItemTitle(r.data?.item?.title || '');
      }
      setLoading(false);
    };
    load();
  }, [mode, itemId]);

  // If no thread yet, show composer to send first message
  useEffect(() => {
    if (mode === 'chat' && !initialThreadId && itemId && !loading) {
      // We need to prompt user to send first message
    }
  }, [mode, initialThreadId, itemId, loading]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const content = inputText.trim();
    setInputText('');
    try {
      if (threadId) {
        const r = await apiPost(`/api/marketplace/chat/threads/${threadId}/messages`, { content });
        if (r.status === 0) {
          // Refresh
          const m = await apiGet(`/api/marketplace/chat/threads/${threadId}/messages`);
          if (m.status === 0) setMessages(m.data?.list || []);
        }
      } else if (itemId) {
        // First message — creates thread
        const r = await apiPost(`/api/marketplace/items/${itemId}/chat/messages`, { content });
        if (r.status === 0) {
          setThreadId(r.data.thread_id);
        }
      }
    } catch { Alert.alert('发送失败'); }
  };

  const isMine = (msg: any) => msg.sender_user_id === user?.id;

  // Threads list view
  if (mode === 'threads') {
    return (
      <SafeAreaView style={s.bg} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
          <Text style={s.headerTitle}>买家咨询</Text>
          <View style={{ width: 50 }} />
        </View>
        <Text style={s.context}>商品：{itemTitle}</Text>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
          <FlatList
            data={threads}
            keyExtractor={(t) => String(t.thread_id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item: t }) => (
              <Pressable style={s.threadCard} onPress={() => { setThreadId(t.thread_id); setMode('chat'); setLoading(true); }}>
                <View style={s.threadInfo}>
                  <Text style={s.threadName}>{t.buyer?.name || '匿名'}</Text>
                  <Text style={s.threadPreview} numberOfLines={1}>{t.last_content || '无消息'}</Text>
                </View>
                {t.unread_count > 0 && <View style={s.unreadBadge}><Text style={s.unreadText}>{t.unread_count}</Text></View>}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={s.empty}>暂无咨询</Text>}
          />
        )}
      </SafeAreaView>
    );
  }

  // Chat view
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => { if (itemId && !initialThreadId) { setMode('threads'); setLoading(true); } else onBack(); }}>
          <Text style={s.back}>← {itemId && !initialThreadId ? '咨询列表' : '返回'}</Text>
        </Pressable>
        <Text style={s.headerTitle}>私聊</Text>
        <View style={{ width: 50 }} />
      </View>
      {itemTitle ? <Text style={s.context}>商品：{itemTitle}</Text> : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item: m }) => (
              <View style={[s.msgBubble, isMine(m) ? s.msgMine : s.msgTheirs]}>
                {!isMine(m) && <Text style={s.msgSender}>{m.sender?.name || '匿名'}</Text>}
                <Text style={[s.msgContent, isMine(m) && { color: '#fff' }]}>{m.content}</Text>
                <Text style={[s.msgTime, isMine(m) && { color: 'rgba(255,255,255,0.6)' }]}>{fmtClock(m.created_at)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>发送第一条消息开始对话</Text>}
          />
        )}

        <View style={s.composer}>
          <TextInput style={s.input} value={inputText} onChangeText={setInputText} placeholder="输入消息..." placeholderTextColor="#94a3b8" maxLength={1200} multiline />
          <Pressable onPress={sendMessage} disabled={!inputText.trim()} style={[s.sendBtn, !inputText.trim() && { opacity: 0.3 }]}>
            <Text style={s.sendText}>发送</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  context: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#f8fafc' },

  // Threads list
  threadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  threadPreview: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  unreadBadge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Messages
  msgBubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginBottom: 6 },
  msgMine: { alignSelf: 'flex-end', backgroundColor: '#0f172a' },
  msgTheirs: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  msgSender: { fontSize: 11, color: '#2563eb', fontWeight: '600', marginBottom: 2 },
  msgContent: { fontSize: 14, color: '#334155', lineHeight: 20 },
  msgTime: { fontSize: 10, color: '#cbd5e1', marginTop: 4, textAlign: 'right' },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', maxHeight: 80 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0f172a', borderRadius: 20 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
