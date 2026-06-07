import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../utils/http';

import { getUploadUrl } from '../api/config';

function prefixImg(url: string) {
  if (!url) return null;
  return getUploadUrl(url);
}

function formatTime(createdAt: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString();
}

interface PostCardProps {
  post: any;
  onPress: (post: any) => void;
  variant?: 'list' | 'compact';
}

export default function PostCard({ post, onPress, variant = 'list' }: PostCardProps) {
  const { isLoggedIn } = useAuth();
  const author = post.author || {};
  const displayName = author.nickname || author.username || '匿名';
  const avatarUrl = prefixImg(author.avatar);
  const level = author.level;
  const badgeEmoji = author.badgeEmoji;
  const content = (post.content || '').length > 120
    ? (post.content || '').slice(0, 120) + '…'
    : (post.content || '');
  const timeStr = formatTime(post.created_at);
  const imageUrls = (post.images || []).map((img: any) => prefixImg(img.url)).filter(Boolean);
  const hasImages = imageUrls.length > 0;
  const [likeNum, setLikeNum] = useState(post.like_count || 0);
  const [liked, setLiked] = useState(!!post.user_liked);
  const commentNum = post.comment_count || 0;

  const handleLike = async (e: any) => {
    e?.stopPropagation?.();
    if (!isLoggedIn) return Alert.alert('请先登录');
    try {
      const data = await apiPost(`/api/posts/${post.id}/like`);
      if (data.status === 0) {
        setLiked(data.data?.liked ?? !liked);
        setLikeNum(data.data?.like_count ?? (data.data?.liked ? likeNum + 1 : Math.max(0, likeNum - 1)));
      }
    } catch {}
  };

  return (
    <View style={s.card}>
      {/* 标签行 */}
      <View style={s.tagRow}>
        <Text style={s.tag}>树洞</Text>
      </View>

      {/* 正文区 — 点击进详情 */}
      <Pressable onPress={() => onPress(post)}>
        <Text style={s.contentText} numberOfLines={5}>{content}</Text>

        {/* 单图：内嵌展示 */}
        {hasImages && imageUrls.length === 1 && (
          <Image source={{ uri: imageUrls[0] }} style={s.singleImage} resizeMode="cover" />
        )}

        {/* 多图：横向滚动 */}
        {imageUrls.length > 1 && (
          <View style={s.multiImageRow}>
            {imageUrls.slice(0, 3).map((uri: string, i: number) => (
              <Image key={i} source={{ uri }} style={s.multiImage} resizeMode="cover" />
            ))}
          </View>
        )}
      </Pressable>

      {/* 底栏：头像 + 昵称 + 等级徽章 + 时间 + 互动按钮 */}
      <View style={s.footer}>
        <View style={s.authorArea}>
          <View style={s.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarPlaceholder}>{(displayName[0] || '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={s.authorInfo}>
            <View style={s.nameRow}>
              <Text style={s.authorName} numberOfLines={1}>{displayName}</Text>
              {level ? (
                <View style={s.levelBadge}>
                  <Text style={s.levelText}>{badgeEmoji || ''} Lv{level}</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.timeText}>{timeStr}</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <Pressable onPress={handleLike} style={s.actionBtn}>
            <Text style={[s.actionIcon, liked && s.likedIcon]}>{liked ? '❤️' : '🤍'}</Text>
            <Text style={[s.actionCount, liked && s.likedCount]}>{likeNum || ''}</Text>
          </Pressable>
          <Pressable onPress={() => onPress(post)} style={s.actionBtn}>
            <Text style={s.actionIcon}>💬</Text>
            <Text style={s.actionCount}>{commentNum || ''}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // 卡片 — 复刻 Web .post-card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    // iOS 风格阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(60,60,67,0.12)',
  },
  // 标签行 — 复刻 .post-card-tags
  tagRow: { flexDirection: 'row', marginBottom: 8 },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // 正文 — 复刻 .post-card-body
  contentText: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 10 },
  // 单图
  singleImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10 },
  // 多图
  multiImageRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  multiImage: { width: 100, height: 100, borderRadius: 8, flex: 1 },
  // 底栏 — 复刻 .post-card-footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60,60,67,0.08)',
  },
  authorArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarImg: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  authorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  levelBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  levelText: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  timeText: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  // 互动按钮
  actionRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionIcon: { fontSize: 14 },
  likedIcon: { color: '#ef4444' },
  actionCount: { fontSize: 12, color: '#94a3b8' },
  likedCount: { color: '#ef4444' },
});
