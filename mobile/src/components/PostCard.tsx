import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

interface PostCardProps {
  post: any;
  onPress: (post: any) => void;
}

export default function PostCard({ post, onPress }: PostCardProps) {
  const author = post.author || {};
  const displayName = author.nickname || author.username || '匿名';
  const avatarUrl = author.avatar
    ? (author.avatar.startsWith('http') ? author.avatar : `http://10.72.10.97:4040${author.avatar}`)
    : null;
  const imageUrl = post.images?.[0]?.url
    ? (post.images[0].url.startsWith('http') ? post.images[0].url : `http://10.72.10.97:4040${post.images[0].url}`)
    : null;

  return (
    <Pressable style={s.card} onPress={() => onPress(post)}>
      <View style={s.header}>
        <View style={s.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarPlaceholder}>{(displayName[0] || '?').toUpperCase()}</Text>
          )}
        </View>
        <View style={s.headerText}>
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.time}>{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</Text>
        </View>
      </View>
      <Text style={s.content} numberOfLines={5}>{post.content}</Text>
      {imageUrl && <Image source={{ uri: imageUrl }} style={s.image} resizeMode="cover" />}
      <View style={s.footer}>
        <Text style={s.stat}>❤️ {post.like_count || 0}</Text>
        <Text style={s.stat}>💬 {post.comment_count || 0}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  headerText: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  content: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 10 },
  image: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10 },
  footer: { flexDirection: 'row', gap: 16, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  stat: { fontSize: 13, color: '#94a3b8' },
});
