import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';

import { getUploadUrl } from '../api/config';
function prefixImg(url: string) { if (!url) return null; return getUploadUrl(url); }

interface Props { post: any; visible: boolean; onClose: () => void; onUpdated: () => void; }

export default function PostDetailModal({ post, visible, onClose, onUpdated }: Props) {
  const { user } = useAuth();
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
    Promise.all([apiGet(`/api/posts/${post.id}`), apiGet(`/api/posts/${post.id}/comments`)]).then(([d, c]) => {
      if (d.status === 0) { setDetail(d.data); setLikeCount(d.data?.like_count || 0); setLiked(d.data?.viewer_liked || false); }
      if (c.status === 0) setComments(c.data?.list || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, post.id]);

  const handleLike = async () => {
    const data = await apiPost(`/api/posts/${post.id}/like`);
    if (data.status === 0) { setLiked(data.data?.liked ?? !liked); setLikeCount(data.data?.like_count ?? (liked ? likeCount - 1 : likeCount + 1)); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    const data = await apiPost(`/api/posts/${post.id}/comments`, { content: commentText.trim() });
    setSending(false);
    if (data.status === 0) { setCommentText(''); const c = await apiGet(`/api/posts/${post.id}/comments`); if (c.status === 0) setComments(c.data?.list || []); }
  };

  const author = detail?.author || {};
  const displayName = author.nickname || author.username || '匿名';
  const avatarUrl = prefixImg(author.avatar);
  const imageUrls = (detail?.images || []).map((img: any) => prefixImg(img.url)).filter(Boolean);
  const heroUrl = imageUrls[0] || null;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topbar}>
          <Pressable onPress={onClose}><Text style={s.backText}>← 返回</Text></Pressable>
          <Text style={s.topTitle}>帖子详情</Text>
          <View style={{ width: 50 }} />
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#94a3b8" /> : (
          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* 头图氛围 — 复刻 Web .post-detail-atmo */}
            {heroUrl && (
              <View style={s.atmoWrap}>
                <Image source={{ uri: heroUrl }} style={s.atmoImg} />
                <View style={s.atmoFade} />
              </View>
            )}

            {/* 卡片 — 复刻 .post-detail-card */}
            <View style={[s.card, heroUrl ? { marginTop: -30 } : {}]}>
              <View style={s.authorRow}>
                <View style={s.avatar}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} style={s.avatarImg} /> : <Text style={s.avatarPlaceholder}>{(displayName[0] || '?').toUpperCase()}</Text>}
                </View>
                <View style={s.authorInfo}>
                  <View style={s.nameRow}>
                    <Text style={s.authorName}>{displayName}</Text>
                    {author.level ? <View style={s.levelBadge}><Text style={s.levelText}>{author.badgeEmoji || ''} Lv{author.level}</Text></View> : null}
                  </View>
                  <Text style={s.timeText}>{detail?.created_at ? new Date(detail.created_at).toLocaleString() : ''}</Text>
                </View>
              </View>
              <Text style={s.content}>{detail?.content || ''}</Text>
              {imageUrls.length > 0 && (
                <View style={s.imageGrid}>
                  {imageUrls.map((uri: string, i: number) => (
                    <Image key={i} source={{ uri }} style={[s.detailImg, imageUrls.length === 1 && s.detailImgSingle]} resizeMode="cover" />
                  ))}
                </View>
              )}
              <View style={s.actionRow}>
                <Pressable onPress={handleLike} style={[s.likeBtn, liked && s.likeBtnActive]}>
                  <Text style={[s.likeText, liked && s.likeTextActive]}>{liked ? '❤️' : '🤍'} {likeCount}</Text>
                </Pressable>
              </View>
            </View>

            {/* 评论列表 */}
            <View style={s.commentSection}>
              <Text style={s.commentTitle}>评论 ({comments.length})</Text>
              {comments.map((c) => (
                <View key={c.id} style={s.commentItem}>
                  <View style={s.commentAvatar}><Text style={s.commentAvatarText}>{(c.author?.nickname || c.author?.username || '?')[0]?.toUpperCase()}</Text></View>
                  <View style={s.commentBody}>
                    <Text style={s.commentName}>{c.author?.nickname || c.author?.username || '匿名'}</Text>
                    <Text style={s.commentContent}>{c.content}</Text>
                    {c.replies?.map((r: any) => (
                      <View key={r.id} style={s.replyItem}>
                        <Text style={s.commentName}>{r.author?.nickname || r.author?.username || '匿名'}</Text>
                        <Text style={s.commentContent}>{r.content}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={s.composer}>
          <TextInput style={s.composerInput} value={commentText} onChangeText={setCommentText} placeholder="写评论..." placeholderTextColor="#94a3b8" />
          <Pressable onPress={handleComment} disabled={sending || !commentText.trim()} style={[s.sendBtn, (!commentText.trim()) && s.sendBtnDisabled]}>
            <Text style={s.sendText}>发送</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  backText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { flex: 1 },
  atmoWrap: { height: 200, overflow: 'hidden' },
  atmoImg: { width: '100%', height: 200, position: 'absolute' },
  atmoFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  authorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  levelBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  levelText: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  timeText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  content: { fontSize: 16, color: '#334155', lineHeight: 25, marginBottom: 14 },
  imageGrid: { gap: 8, marginBottom: 14 },
  detailImg: { width: '100%', height: 200, borderRadius: 12 },
  detailImgSingle: { height: 260 },
  actionRow: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  likeBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f8fafc' },
  likeBtnActive: { backgroundColor: '#fef2f2' },
  likeText: { fontSize: 15, color: '#64748b' },
  likeTextActive: { color: '#ef4444' },
  commentSection: { paddingHorizontal: 16, paddingTop: 20 },
  commentTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  commentItem: { flexDirection: 'row', marginBottom: 16 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentAvatarText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  commentBody: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  commentContent: { fontSize: 14, color: '#475569', lineHeight: 21 },
  replyItem: { marginTop: 10, marginLeft: 12, paddingLeft: 10, borderLeftWidth: 1.5, borderLeftColor: '#e2e8f0' },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', gap: 8 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc' },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0f172a' },
  sendBtnDisabled: { opacity: 0.3 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
