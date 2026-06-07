import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/http';

export default function CourseReviewDetailScreen({ reviewId, onBack, onEdit }: { reviewId: number; onBack: () => void; onEdit: (id: number) => void }) {
  const [review, setReview] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [myRating, setMyRating] = useState(0);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet(`/api/handbook/course-reviews/${reviewId}`),
      apiGet(`/api/handbook/course-reviews/${reviewId}/comments`),
    ]).then(([r, c]) => {
      if (r.status === 0) setReview(r.data);
      if (c.status === 0) setComments(c.data || []);
      setLoading(false);
    });
  }, [reviewId]);

  const handleRate = async (n: number) => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    setMyRating(n);
    const r = await apiPost(`/api/handbook/course-reviews/${reviewId}/rate`, { rating: n });
    if (r.status === 0) Alert.alert('评分成功');
    else Alert.alert('评分失败', r.message);
  };

  const submitComment = async () => {
    if (!isLoggedIn) return Alert.alert('请先登录');
    if (!commentText.trim()) return;
    const r = await apiPost(`/api/handbook/course-reviews/${reviewId}/comments`, { content: commentText.trim() });
    if (r.status === 0) { setCommentText(''); const c = await apiGet(`/api/handbook/course-reviews/${reviewId}/comments`); if (c.status === 0) setComments(c.data || []); }
    else Alert.alert('评论失败', r.message);
  };

  const canEdit = review?.viewer?.canEdit;

  if (loading) return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 评价</Text></Pressable>
        {canEdit && <Pressable onPress={() => onEdit(reviewId)}><Text style={s.editBtn}>编辑</Text></Pressable>}
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.courseName}>{review?.course_name}</Text>
        <Text style={s.teacher}>👨‍🏫 {review?.teacher || '未知'}</Text>
        {review?.term_year && <Text style={s.term}>{review.term_year}/{review.term_month}</Text>}

        <View style={s.ratingsRow}>
          <View style={s.ratingBox}><Text style={s.ratingNum}>{'⭐'.repeat(review?.rating || 0)}</Text><Text style={s.ratingLabel}>评分</Text></View>
          <View style={s.ratingBox}><Text style={s.ratingNum}>{review?.difficulty || '-'}/5</Text><Text style={s.ratingLabel}>难度</Text></View>
          <View style={s.ratingBox}><Text style={s.ratingNum}>{review?.avg_rating ? Number(review.avg_rating).toFixed(1) : '-'}</Text><Text style={s.ratingLabel}>均分</Text></View>
        </View>

        {review?.comment && <Text style={s.comment}>{review.comment}</Text>}

        {/* Rate this review */}
        <Text style={s.sectionTitle}>为这条评价打分</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => handleRate(n)}>
              <Text style={[s.star, n <= myRating && s.starActive]}>{n <= myRating ? '★' : '☆'}</Text>
            </Pressable>
          ))}
        </View>

        {/* Comments */}
        <Text style={s.sectionTitle}>评论 ({comments.length})</Text>
        {comments.map((c: any) => (
          <View key={c.id} style={s.commentCard}>
            <Text style={s.commentAuthor}>匿名</Text>
            <Text style={s.commentContent}>{c.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.composer}>
        <View style={s.composerRow}>
          <TextInput style={s.composerInput} value={commentText} onChangeText={setCommentText} placeholder="匿名评论..." placeholderTextColor="#94a3b8" maxLength={800} />
          <Pressable onPress={submitComment}><Text style={[s.sendBtn, !commentText.trim() && { opacity: 0.3 }]}>发送</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  editBtn: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  body: { padding: 16, paddingBottom: 120 },
  courseName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  teacher: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  term: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  ratingsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  ratingBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' },
  ratingNum: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  ratingLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  comment: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10, marginTop: 8 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  star: { fontSize: 32, color: '#e2e8f0' },
  starActive: { color: '#f59e0b' },
  commentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6 },
  commentAuthor: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  commentContent: { fontSize: 14, color: '#475569' },
  composer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 20 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  sendBtn: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
