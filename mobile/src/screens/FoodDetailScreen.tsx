import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/http';
import { API_BASE_URL } from '../api/config';


interface Props { product: any; onBack: () => void; onReview?: (p: any) => void; }
export default function FoodDetailScreen({ product, onBack, onReview }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet(`/api/canteen/products/${product.id}`),
      apiGet(`/api/canteen/products/${product.id}/comments`),
    ]).then(([d, c]) => {
      if (d.status === 0) setDetail(d.data);
      if (c.status === 0) setComments(c.data?.list || []);
      setLoading(false);
    });
  }, [product.id]);

  const imgUrl = detail?.images?.[0]?.url
    ? (detail.images[0].url.startsWith('http') ? detail.images[0].url : `${API_BASE_URL}${detail.images[0].url}`)
    : product.images?.[0]?.url
      ? (product.images[0].url.startsWith('http') ? product.images[0].url : `${API_BASE_URL}${product.images[0].url}`)
      : null;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable>
        <Text style={s.headerTitle}>商品详情</Text>
        <View style={{width:50}} />
      </View>

      {loading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
        <ScrollView contentContainerStyle={s.body}>
          {imgUrl && <Image source={{ uri: imgUrl }} style={s.heroImg} />}
          <Text style={s.name}>{detail?.name || product.name}</Text>
          {detail?.price ? <Text style={s.price}>RM {detail.price}</Text> : null}
          {detail?.description ? <Text style={s.desc}>{detail.description}</Text> : null}

          {/* 操作按钮 */}
          <View style={s.actionRow}>
            <Pressable onPress={() => setFavorited(!favorited)} style={[s.actionBtn, favorited && s.actionBtnActive]}>
              <Text style={[s.actionText, favorited && s.actionTextActive]}>{favorited ? '♥ 已收藏' : '♡ 收藏'}</Text>
            </Pressable>
            {onReview && (
              <Pressable onPress={() => onReview(product)} style={s.reviewBtn}>
                <Text style={s.reviewText}>✏️ 写点评</Text>
              </Pressable>
            )}
          </View>

          {/* 评论 */}
          <Text style={s.sectionTitle}>点评 ({comments.length})</Text>
          {comments.map((c) => (
            <View key={c.id} style={s.commentItem}>
              <View style={s.commentHeader}>
                <Text style={s.commentAuthor}>{c.author?.nickname || c.author?.username || '匿名'}</Text>
                {c.rating ? <Text style={s.rating}>{'⭐'.repeat(Number(c.rating))}</Text> : null}
              </View>
              <Text style={s.commentContent}>{c.content}</Text>
              {c.replies?.map((r: any) => (
                <View key={r.id} style={s.replyItem}>
                  <Text style={s.commentAuthor}>{r.author?.nickname || r.author?.username || '匿名'}</Text>
                  <Text style={s.commentContent}>{r.content}</Text>
                </View>
              ))}
            </View>
          ))}
          {comments.length === 0 && <Text style={s.empty}>暂无点评</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 16, paddingBottom: 40 },
  heroImg: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#f1f5f9' },
  name: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '700', color: '#16a34a', marginBottom: 12 },
  desc: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 8 },
  commentItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rating: { fontSize: 12 },
  commentContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  replyItem: { marginTop: 8, marginLeft: 12, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#e2e8f0' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  actionBtnActive: { backgroundColor: '#fef2f2' },
  actionText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  actionTextActive: { color: '#ef4444' },
  reviewBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center' },
  reviewText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 20 },
});
