import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

const API = 'http://10.72.10.97:4040';
function pimg(url: string) { if (!url) return null; return url.startsWith('http') ? url : `${API}${url}`; }

interface Props { post: any; cardWidth: number; onPress: (post: any) => void; }

export default function PostCardWaterfall({ post, cardWidth, onPress }: Props) {
  const { isLoggedIn } = useAuth();
  const author = post.author || {};
  const displayName = author.nickname || author.username || '匿名';
  const avatarUrl = pimg(author.avatar);
  const coverUrl = post.images?.[0]?.url ? pimg(post.images[0].url) : null;
  const title = (post.title || '').trim() || (post.content || '').slice(0, 30);
  const [liked, setLiked] = useState(!!post.user_liked);
  const [likeNum, setLikeNum] = useState(post.like_count || 0);
  const commentNum = post.comment_count || 0;

  const handleLike = (e: any) => { e?.stopPropagation?.(); if (!isLoggedIn) return Alert.alert('请先登录');
    apiPost(`/api/posts/${post.id}/like`).then((d) => { if (d.status===0) { setLiked(d.data?.liked??!liked); setLikeNum(d.data?.like_count??(d.data?.liked?likeNum+1:Math.max(0,likeNum-1))); } }).catch(()=>{}); };

  return (
    <View style={[st.card, { width: cardWidth }]}>
      <Pressable onPress={() => onPress(post)}>
        {/* 封面图 */}
        {coverUrl ? (
          <View style={st.coverWrap}>
            <Image source={{ uri: coverUrl }} style={st.cover} resizeMode="cover" />
          </View>
        ) : null}

        {/* 标题 */}
        <Text style={[st.title, coverUrl && { marginHorizontal: 12, marginTop: 10 }]} numberOfLines={2}>{title}</Text>

        {/* 正文（无图时显示更多） */}
        {!coverUrl && (
          <Text style={st.content} numberOfLines={3}>{post.content || ''}</Text>
        )}
      </Pressable>

      {/* 底栏 */}
      <View style={[st.footer, coverUrl && st.footerCompact]}>
        <View style={st.authorRow}>
          <View style={st.avatar}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={st.avatarImg} /> : <Text style={st.avatarPlace}>{(displayName[0]||'?').toUpperCase()}</Text>}
          </View>
          <Text style={st.authorName} numberOfLines={1}>{displayName}</Text>
        </View>
        <View style={st.actions}>
          <Pressable onPress={handleLike} style={[st.likeBtn, liked && st.likeBtnActive]}>
            <Text style={[st.likeIcon, liked && st.likeIconActive]}>{liked ? '♥' : '♡'}</Text>
            <Text style={[st.likeCount, liked && st.likeCountActive]}>{likeNum||''}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 0.5, borderColor: 'rgba(60,60,67,0.10)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  coverWrap: { aspectRatio: 4/3, backgroundColor: 'rgba(118,118,128,0.10)' },
  cover: { width: '100%', height: '100%' },
  title: { fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.88)', lineHeight: 19, letterSpacing: -0.3, margin: 12, marginBottom: 6 },
  content: { fontSize: 13, color: 'rgba(0,0,0,0.65)', lineHeight: 18, marginHorizontal: 12, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(60,60,67,0.08)' },
  footerCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 24, height: 24, borderRadius: 12 },
  avatarPlace: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  authorName: { fontSize: 12, fontWeight: '500', color: 'rgba(0,0,0,0.88)', flex: 1 },
  actions: { flexDirection: 'row' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(118,118,128,0.10)' },
  likeBtnActive: { backgroundColor: 'rgba(255,59,48,0.10)' },
  likeIcon: { fontSize: 13, color: 'rgba(60,60,67,0.50)' },
  likeIconActive: { color: '#ff3b30' },
  likeCount: { fontSize: 11, color: 'rgba(60,60,67,0.50)', fontVariant: ['tabular-nums'] },
  likeCountActive: { color: '#ff3b30' },
});
