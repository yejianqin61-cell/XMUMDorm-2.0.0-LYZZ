import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../api/client';
import { fmtTime, prefixImg } from '../utils';


interface Props { targetType: 'activity' | 'post'; targetId: number; onBack: () => void; }

export default function ActivityPostDetailScreen({ targetType, targetId, onBack }: Props) {
  const [item, setItem] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet(`/api/clubs/${targetType}/${targetId}`),
      apiGet(`/api/clubs/${targetType}/${targetId}/comments`),
    ]).then(([p, c]) => {
      if (p.status === 0) {
        setItem(p.data);
        setLiked(p.data.user_liked || false);
        setLikeCount(p.data.like_count || 0);
      }
      if (c.status === 0) setComments(c.data || []);
      setLoading(false);
    });
    // Track view
    apiPost('/api/clubs/views', { target_type: targetType, target_id: targetId }).catch(() => {});
  }, [targetType, targetId]);

  const handleLike = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    const prev = liked;
    setLiked(!liked);
    setLikeCount((c: number) => c + (liked ? -1 : 1));
    try {
      const data = await apiPost('/api/clubs/likes/toggle', { target_type: targetType, target_id: targetId });
      if (data.status === 0) { setLiked(data.liked); setLikeCount(data.like_count); }
      else { setLiked(prev); setLikeCount((c: number) => c + (prev ? 1 : -1)); }
    } catch { setLiked(prev); setLikeCount((c: number) => c + (prev ? 1 : -1)); }
  };

  const submitComment = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const body: any = { content: commentText.trim() };
      if (replyingTo) body.parent_id = replyingTo.id;
      const data = await apiPost(`/api/clubs/${targetType}/${targetId}/comments`, body);
      if (data.status === 0) {
        setCommentText('');
        setReplyingTo(null);
        const c = await apiGet(`/api/clubs/${targetType}/${targetId}/comments`);
        if (c.status === 0) setComments(c.data || []);
      } else { Alert.alert('评论失败', data.message); }
    } catch { Alert.alert('网络错误'); }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: number) => {
    const r = await apiDelete(`/api/clubs/${targetType}/${targetId}/comments/${commentId}`);
    if (r.status === 0) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };


  if (loading) return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>{targetType === 'activity' ? '活动' : '帖子'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>{item?.title || '无标题'}</Text>
          <View style={s.authorRow}>
            <Text style={s.authorName}>{item?.author?.nickname || item?.author?.username || '匿名'}</Text>
            <Text style={s.time}>{fmtTime(item?.created_at)}</Text>
          </View>
          {item?.summary && <Text style={s.summary}>{item.summary}</Text>}
          {item?.start_time && <Text style={s.meta}>🕐 {fmtTime(item.start_time)}</Text>}
          {item?.location && <Text style={s.meta}>📍 {item.location}</Text>}
          {item?.content && <Text style={s.content}>{item.content}</Text>}

          {/* Images */}
          {item?.images?.map((img: any, i: number) => (
            <Image key={i} source={{ uri: prefixImg(img.url || img) }} style={s.postImg} />
          ))}
          {item?.cover && !item?.images && <Image source={{ uri: prefixImg(item.cover) }} style={s.postImg} />}

          <View style={s.actionRow}>
            <Pressable onPress={handleLike} style={s.likeBtn}>
              <Text style={[s.likeText, liked && s.likedText]}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
            </Pressable>
            <Text style={s.meta}>💬 {comments.length}</Text>
          </View>
        </View>

        {/* Comments */}
        <Text style={s.sectionTitle}>评论 ({comments.length})</Text>
        {comments.map((c) => (
          <View key={c.id} style={s.commentCard}>
            <View style={s.commentHeader}>
              <Text style={s.commentAuthor}>{c.author?.nickname || c.author?.username || '匿名'}</Text>
              <Text style={s.commentTime}>{fmtTime(c.created_at)}</Text>
            </View>
            <Text style={s.commentContent}>{c.content}</Text>
            <View style={s.commentActions}>
              <Pressable onPress={() => setReplyingTo(c)}><Text style={s.replyHint}>回复</Text></Pressable>
              {(user?.id === c.user_id || user?.role === 'admin') && (
                <Pressable onPress={() => handleDeleteComment(c.id)}><Text style={s.delHint}>删除</Text></Pressable>
              )}
            </View>
            {c.replies?.map((r: any) => (
              <View key={r.id} style={s.replyItem}>
                <Text style={s.commentAuthor}>{r.author?.nickname || r.author?.username || '匿名'}</Text>
                <Text style={s.commentContent}>{r.content}</Text>
                <Text style={s.commentTime}>{fmtTime(r.created_at)}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Composer */}
      <View style={s.composer}>
        {replyingTo && (
          <View style={s.replyingBar}>
            <Text style={s.replyingText} numberOfLines={1}>回复: {replyingTo.author?.nickname || '匿名'}</Text>
            <Pressable onPress={() => setReplyingTo(null)}><Text style={s.cancelReply}>✕</Text></Pressable>
          </View>
        )}
        <View style={s.composerRow}>
          <TextInput style={s.composerInput} value={commentText} onChangeText={setCommentText} placeholder={isLoggedIn ? '评论...' : '请先登录'} placeholderTextColor="#94a3b8" editable={isLoggedIn} maxLength={500} />
          <Pressable onPress={submitComment} disabled={submitting || !commentText.trim()}><Text style={[s.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.3 }]}>发送</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 120 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  authorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  time: { fontSize: 12, color: '#94a3b8' },
  summary: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  content: { fontSize: 15, color: '#334155', lineHeight: 23, marginBottom: 12 },
  postImg: { width: '100%', height: 220, borderRadius: 10, marginBottom: 8, backgroundColor: '#f1f5f9' },
  actionRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 4 },
  likeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f8fafc' },
  likeText: { fontSize: 14, color: '#64748b' },
  likedText: { color: '#ef4444' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 8 },

  commentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  commentTime: { fontSize: 11, color: '#94a3b8' },
  commentContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  commentActions: { flexDirection: 'row', gap: 14, marginTop: 4 },
  replyHint: { fontSize: 12, color: '#2563eb' },
  delHint: { fontSize: 12, color: '#ef4444' },
  replyItem: { marginTop: 8, marginLeft: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#e2e8f0' },

  composer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 20 },
  replyingBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 },
  replyingText: { fontSize: 12, color: '#2563eb', flex: 1 },
  cancelReply: { fontSize: 14, color: '#94a3b8', paddingLeft: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  sendBtn: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
