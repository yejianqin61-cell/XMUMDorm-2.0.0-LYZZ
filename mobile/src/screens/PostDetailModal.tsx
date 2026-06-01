import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';

interface Props { post: any; visible: boolean; onClose: () => void; onUpdated: () => void; }

export default function PostDetailModal({ post, visible, onClose, onUpdated }: Props) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<any>(post);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      apiGet(`/api/posts/${post.id}`),
      apiGet(`/api/posts/${post.id}/comments`),
    ]).then(([d, c]) => {
      if (d.status === 0) { setDetail(d.data); setLikeCount(d.data?.like_count || 0); setLiked(d.data?.viewer_liked || false); }
      if (c.status === 0) setComments(c.data?.list || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, post.id]);

  const handleLike = async () => {
    if (!token) return;
    const data = await apiPost(`/api/posts/${post.id}/like`);
    if (data.status === 0) {
      setLiked(data.data?.liked ?? !liked);
      setLikeCount(data.data?.like_count ?? (liked ? likeCount - 1 : likeCount + 1));
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    const data = await apiPost(`/api/posts/${post.id}/comments`, { content: commentText.trim() });
    setSending(false);
    if (data.status === 0) {
      setCommentText('');
      const c = await apiGet(`/api/posts/${post.id}/comments`);
      if (c.status === 0) setComments(c.data?.list || []);
    } else {
      Alert.alert('评论失败', data.message);
    }
  };

  const author = detail?.author || {};
  const displayName = author.nickname || author.username || '匿名';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.bg}>
        <View style={s.topbar}>
          <Text style={s.backBtn} onPress={onClose}>← 返回</Text>
          <Text style={s.topTitle}>帖子详情</Text>
          <View style={{ width: 50 }} />
        </View>
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={s.authorRow}>
              <Text style={s.authorName}>{displayName}</Text>
              <Text style={s.time}>{detail?.created_at ? new Date(detail.created_at).toLocaleString() : ''}</Text>
            </View>
            <Text style={s.content}>{detail?.content || ''}</Text>
            {detail?.images?.map((img: any, i: number) => (
              <Image key={i} source={{ uri: img.url?.startsWith('http') ? img.url : `http://10.72.10.97:4040${img.url}` }} style={s.image} resizeMode="cover" />
            ))}
            <View style={s.actions}>
              <Pressable onPress={handleLike} style={[s.actionBtn, liked && s.likedBtn]}>
                <Text style={[s.actionText, liked && s.likedText]}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
              </Pressable>
            </View>
            <Text style={s.sectionTitle}>评论 ({comments.length})</Text>
            {comments.map((c) => (
              <View key={c.id} style={s.commentItem}>
                <Text style={s.commentAuthor}>{c.author?.nickname || c.author?.username || '匿名'}</Text>
                <Text style={s.commentContent}>{c.content}</Text>
                {c.replies?.map((r: any) => (
                  <View key={r.id} style={s.replyItem}>
                    <Text style={s.commentAuthor}>{r.author?.nickname || r.author?.username || '匿名'}</Text>
                    <Text style={s.commentContent}>{r.content}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
        <View style={s.composer}>
          <TextInput style={s.composerInput} value={commentText} onChangeText={setCommentText} placeholder="写评论..." placeholderTextColor="#94a3b8" />
          <Pressable onPress={handleComment} disabled={sending || !commentText.trim()} style={[s.sendBtn, (!commentText.trim()) && { opacity: 0.3 }]}>
            <Text style={s.sendText}>发送</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  backBtn: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { flex: 1, padding: 16 },
  authorRow: { marginBottom: 12 },
  authorName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  time: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  content: { fontSize: 16, color: '#334155', lineHeight: 24, marginBottom: 14 },
  image: { width: '100%', height: 220, borderRadius: 12, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  likedBtn: { backgroundColor: '#fef2f2' },
  actionText: { fontSize: 14, color: '#64748b' },
  likedText: { color: '#ef4444' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  commentItem: { marginBottom: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#e2e8f0' },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  commentContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  replyItem: { marginTop: 8, marginLeft: 16, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', gap: 8 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#0f172a' },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
