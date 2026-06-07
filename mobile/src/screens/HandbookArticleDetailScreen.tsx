import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ScrollView, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/http';
import { fmtTime, prefixImg } from '../utils';


export default function HandbookArticleDetailScreen({ articleId, onBack }: { articleId: number; onBack: () => void }) {
  const [article, setArticle] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet(`/api/handbook/articles/${articleId}`),
      apiGet(`/api/handbook/articles/${articleId}/comments`),
    ]).then(([a, c]) => {
      if (a.status === 0) { setArticle(a.data); setLiked(a.data.user_liked || false); setSaved(a.data.user_saved || false); setLikeCount(a.data.likes_count || 0); }
      if (c.status === 0) setComments(c.data || []);
      setLoading(false);
    });
  }, [articleId]);

  const handleLike = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    setLiked(!liked); setLikeCount(c => c + (liked ? -1 : 1));
    const r = await apiPost(`/api/handbook/articles/${articleId}/like`);
    if (r.status === 0) { setLiked(r.liked ?? r.data?.liked); setLikeCount(r.like_count ?? r.data?.like_count); }
  };

  const handleSave = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    setSaved(!saved);
    await apiPost(`/api/handbook/articles/${articleId}/save`);
  };

  const submitComment = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    if (!commentText.trim()) return;
    const body: any = { content: commentText.trim() };
    if (replyingTo) body.parent_id = replyingTo.id;
    const r = await apiPost(`/api/handbook/articles/${articleId}/comments`, body);
    if (r.status === 0) { setCommentText(''); setReplyingTo(null); const c = await apiGet(`/api/handbook/articles/${articleId}/comments`); if (c.status === 0) setComments(c.data || []); }
    else Alert.alert('评论失败', r.message);
  };

  if (loading) return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 一站通</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={handleSave}><Text style={{ fontSize: 18 }}>{saved ? '🔖' : '🏷️'}</Text></Pressable>
          <Pressable onPress={handleLike}><Text style={{ fontSize: 18 }}>{liked ? '❤️' : '🤍'}</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {article?.cover_path && <Image source={{ uri: prefixImg(article.cover_path) }} style={s.cover} />}
        <Text style={s.title}>{article?.title}</Text>
        <View style={s.metaRow}><Text style={s.meta}>{article?.author?.nickname || article?.author?.username || '匿名'}</Text><Text style={s.meta}>👁 {article?.views_count || 0}</Text><Text style={s.meta}>❤️ {likeCount}</Text></View>
        {article?.summary && <Text style={s.summary}>{article.summary}</Text>}
        <Text style={s.content}>{article?.content || ''}</Text>
        {article?.source_name && <Text style={s.source}>来源：{article.source_name}</Text>}

        <Text style={s.sectionTitle}>评论 ({comments.length})</Text>
        {comments.map((c: any) => (
          <View key={c.id} style={s.commentCard}>
            <View style={s.commentHeader}>
              <Text style={s.commentAuthor}>{c.author?.nickname || c.author?.username || '匿名'}</Text>
              <Text style={s.commentTime}>{fmtTime(c.created_at)}</Text>
            </View>
            <Text style={s.commentContent}>{c.content}</Text>
            <Pressable onPress={() => setReplyingTo(c)}><Text style={s.replyHint}>回复</Text></Pressable>
            {c.replies?.map((r: any) => (
              <View key={r.id} style={s.replyItem}>
                <Text style={s.commentAuthor}>{r.author?.nickname || r.author?.username || '匿名'}</Text>
                <Text style={s.commentContent}>{r.content}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={s.composer}>
        {replyingTo && <View style={s.replyingBar}><Text style={s.replyingText}>回复: {replyingTo.author?.nickname || '匿名'}</Text><Pressable onPress={() => setReplyingTo(null)}><Text style={{ color: '#94a3b8' }}>✕</Text></Pressable></View>}
        <View style={s.composerRow}>
          <TextInput style={s.composerInput} value={commentText} onChangeText={setCommentText} placeholder="评论..." placeholderTextColor="#94a3b8" maxLength={500} />
          <Pressable onPress={submitComment}><Text style={[s.sendBtn, !commentText.trim() && { opacity: 0.3 }]}>发送</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

