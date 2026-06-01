import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Heart, MessageCircle } from 'lucide-react-native';
import { getUploadUrl, API_BASE_URL } from '../api/config';

function toPostThumbUrl(fullUrl: string | null): string | null {
  if (!fullUrl) return null;
  try {
    const base = API_BASE_URL || 'http://localhost';
    const u = new URL(fullUrl, base);
    const p = u.pathname || '';
    const replaced = p.replace(
      /(\/uploads)?\/posts\/post_(\d+)_([0-9]+)\.(jpg|jpeg|png|webp|gif)$/i,
      (_m, uploadsPrefix, id, idx) => `${uploadsPrefix || ''}/posts/thumbs/post_${id}_${idx}.webp`
    );
    if (replaced === p) return fullUrl;
    u.pathname = replaced;
    return u.toString();
  } catch {
    return fullUrl;
  }
}

function prefixImage(url?: string | null) {
  if (!url) return null;
  return getUploadUrl(url);
}

function getAuthor(post: any) {
  const a = post?.author;
  if (a && typeof a === 'object') {
    return {
      name: a.nickname ?? a.username ?? 'Anonymous',
      avatar: prefixImage(a.avatar),
    };
  }
  return { name: 'Anonymous', avatar: null };
}

interface Props {
  post: any;
  cardWidth: number;
  onPress: (post: any) => void;
}

export default function PostCardWaterfall({ post, cardWidth, onPress }: Props) {
  const author = getAuthor(post);
  const likeNum = post.like_count ?? post.likeCount ?? 0;
  const commentNum = post.comment_count ?? post.commentCount ?? 0;
  const cover = post.images?.[0]?.url ? prefixImage(post.images[0].url) : null;
  const coverThumb = cover ? toPostThumbUrl(cover) : null;
  const title = (post.title || '').trim();
  const text = (post.content || '').trim();
  const display = title || (text.length > 64 ? `${text.slice(0, 64)}…` : text) || ' ';

  const [imgSrc, setImgSrc] = useState<string | null>(() => coverThumb || cover);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const u = coverThumb || cover;
    setImgSrc(u);
    setLoaded(false);
    setErrored(false);
  }, [cover, coverThumb]);

  const mediaH = useMemo(() => (cardWidth * 5) / 4, [cardWidth]);

  if (!cover) {
    return (
      <Pressable
        onPress={() => onPress(post)}
        style={({ pressed }) => [st.card, st.noImgCard, { width: cardWidth }, pressed && st.pressed]}
      >
        <View style={st.noImgHead}>
          <View style={st.noImgAvatar}>
            {author.avatar ? (
              <Image source={{ uri: author.avatar }} style={st.avatarImg} />
            ) : (
              <Text style={st.avatarPlace}>{(author.name[0] || '?').toUpperCase()}</Text>
            )}
          </View>
          <Text style={st.noImgAuthor} numberOfLines={1}>{author.name}</Text>
        </View>
        <Text style={st.noImgText} numberOfLines={3}>{display}</Text>
        <View style={st.noImgActions}>
          <View style={st.actionRow}>
            <Heart size={16} color="rgba(0, 91, 172, 0.92)" strokeWidth={2.2} />
            <Text style={st.noImgActionText}>{likeNum}</Text>
          </View>
          <View style={st.actionRow}>
            <MessageCircle size={16} color="rgba(0, 91, 172, 0.92)" strokeWidth={2.2} />
            <Text style={st.noImgActionText}>{commentNum}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(post)}
      style={({ pressed }) => [st.card, { width: cardWidth }, pressed && st.pressed]}
    >
      <View style={[st.media, { height: mediaH }]}>
        {!errored && imgSrc ? (
          <>
            <Image
              source={{ uri: imgSrc }}
              style={[st.cover, !loaded && st.coverLoading]}
              blurRadius={loaded ? 0 : 14}
              onLoad={() => setLoaded(true)}
              onError={() => {
                if (coverThumb && imgSrc === coverThumb && coverThumb !== cover) {
                  setImgSrc(cover);
                  setLoaded(false);
                  return;
                }
                setErrored(true);
                setLoaded(true);
              }}
            />
            {!loaded ? <View style={st.loadingVeil} /> : null}
          </>
        ) : (
          <LinearGradient
            colors={['rgba(16,185,129,0.18)', 'rgba(99,102,241,0.18)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.70)']}
          locations={[0.45, 1]}
          style={st.bottomGradient}
          pointerEvents="none"
        />

        <View style={st.headerPill} pointerEvents="none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="light" style={st.headerPillBlur}>
              <View style={st.headerPillInner}>
                <View style={st.pillAvatar}>
                  {author.avatar ? (
                    <Image source={{ uri: author.avatar }} style={st.pillAvatarImg} />
                  ) : (
                    <Text style={st.pillAvatarText}>{(author.name[0] || '?').toUpperCase()}</Text>
                  )}
                </View>
                <Text style={st.pillAuthor} numberOfLines={1}>{author.name}</Text>
              </View>
            </BlurView>
          ) : (
            <View style={[st.headerPillInner, st.headerPillAndroid]}>
              <View style={st.pillAvatar}>
                {author.avatar ? (
                  <Image source={{ uri: author.avatar }} style={st.pillAvatarImg} />
                ) : (
                  <Text style={st.pillAvatarText}>{(author.name[0] || '?').toUpperCase()}</Text>
                )}
              </View>
              <Text style={st.pillAuthor} numberOfLines={1}>{author.name}</Text>
            </View>
          )}
        </View>

        <View style={st.content} pointerEvents="none">
          <Text style={st.glassText} numberOfLines={3}>{display}</Text>
          <View style={st.glassActions}>
            <View style={st.actionRow}>
              <Heart size={16} color="rgba(255,255,255,0.90)" strokeWidth={2.2} />
              <Text style={st.glassActionText}>{likeNum}</Text>
            </View>
            <View style={st.actionRow}>
              <MessageCircle size={16} color="rgba(255,255,255,0.90)" strokeWidth={2.2} />
              <Text style={st.glassActionText}>{commentNum}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 1)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 4,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  media: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    position: 'relative',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverLoading: {
    transform: [{ scale: 1.06 }],
  },
  loadingVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  headerPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 1)',
  },
  headerPillBlur: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  headerPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingRight: 8,
    paddingLeft: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  headerPillAndroid: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  pillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillAvatarImg: { width: 20, height: 20 },
  pillAvatarText: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  pillAuthor: {
    maxWidth: 110,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(15, 23, 42, 0.86)',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 12,
  },
  glassText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.15,
    color: 'rgba(255,255,255,0.96)',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  glassActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glassActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.90)',
  },
  noImgCard: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  noImgHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noImgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: 24, height: 24 },
  avatarPlace: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  noImgAuthor: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(15, 23, 42, 0.80)',
  },
  noImgText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    color: 'rgba(15, 23, 42, 0.88)',
  },
  noImgActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noImgActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 91, 172, 0.92)',
  },
});
