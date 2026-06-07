import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, Alert,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/http';
import { prefixImg } from '../utils';

const { width: SW } = Dimensions.get('window');

interface Props {
  itemId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onChat: (threadId: number, itemId: number) => void;
  onChatList: (itemId: number) => void;
}

export default function MarketplaceDetailScreen({ itemId, onBack, onEdit, onChat, onChatList }: Props) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [want, setWant] = useState(false);
  const [wantsCount, setWantsCount] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    apiGet(`/api/marketplace/items/${itemId}`).then((r) => {
      if (r.status === 0) {
        setItem(r.data);
        setWant(r.data.viewer?.want || false);
        setWantsCount(r.data.wants_count || 0);
      }
      setLoading(false);
    });
  }, [itemId]);


  const handleWant = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    const prev = want;
    setWant(!want);
    setWantsCount((c: number) => c + (want ? -1 : 1));
    try {
      const r = await apiPost(`/api/marketplace/items/${itemId}/want`);
      if (r.status === 0) { setWant(r.data.want); setWantsCount(r.data.wants_count); }
      else { setWant(prev); setWantsCount((c: number) => c + (prev ? 1 : -1)); }
    } catch { setWant(prev); setWantsCount((c: number) => c + (prev ? 1 : -1)); }
  };

  const handleStatus = async (status: string) => {
    const r = await apiPost(`/api/marketplace/items/${itemId}/status`, { status });
    if (r.status === 0) { setItem((prev: any) => ({ ...prev, status })); Alert.alert('状态已更新'); }
    else Alert.alert('操作失败', r.message);
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const r = await apiDelete(`/api/marketplace/items/${itemId}`);
        if (r.status === 0) { Alert.alert('已删除', '', [{ text: '好的', onPress: onBack }]); }
      }},
    ]);
  };

  const isSeller = user && item && user.id === item.sellerInfo?.id;
  const isAdmin = user?.role === 'admin';
  const canManage = isSeller || isAdmin;

  if (loading) return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  const images = item?.images || [];

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 二手</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={handleWant}><Text style={{ fontSize: 22 }}>{want ? '❤️' : '🤍'}</Text></Pressable>
          {canManage && <Pressable onPress={() => onEdit(itemId)}><Text style={s.back}>编辑</Text></Pressable>}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Image carousel */}
        {images.length > 0 && (
          <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW))}
            >
              {images.map((img: any, i: number) => (
                <Image key={i} source={{ uri: prefixImg(img.url) }} style={[s.heroImg, { width: SW - 24 }]} />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={s.dots}>
                {images.map((_: any, i: number) => <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />)}
              </View>
            )}
          </View>
        )}

        <Text style={s.title}>{item?.title}</Text>
        <View style={s.badgeRow}>
          <Text style={s.priceBadge}>RM {Number(item?.price || 0).toFixed(2)}</Text>
          <Text style={[s.statusBadge, item?.status === 'sold' && s.soldBadge]}>{item?.status === 'on_sale' ? '在售' : '已售'}</Text>
          <Text style={s.metaBadge}>{item?.dorm_area || '--'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.info}>{item?.delivery_method === 'delivery' ? '🚚 配送' : '🤝 自取'}</Text>
          <Text style={s.info}>❤️ {wantsCount} 收藏</Text>
          <Text style={s.info}>👤 {item?.sellerInfo?.name || '匿名'}</Text>
        </View>

        {item?.description ? <Text style={s.desc}>{item.description}</Text> : null}

        {/* Owner actions */}
        {canManage && (
          <View style={s.ownerActions}>
            <Text style={s.sectionTitle}>管理</Text>
            <View style={s.actionRow}>
              {item?.status === 'on_sale' && (
                <Pressable style={s.actionBtn} onPress={() => handleStatus('sold')}><Text style={s.actionBtnText}>标记已售</Text></Pressable>
              )}
              {item?.status === 'sold' && (
                <Pressable style={[s.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => handleStatus('on_sale')}><Text style={s.actionBtnText}>重新上架</Text></Pressable>
              )}
              <Pressable style={[s.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={handleDelete}><Text style={[s.actionBtnText, { color: '#ef4444' }]}>删除</Text></Pressable>
            </View>
          </View>
        )}

        {/* Chat section */}
        <View style={s.chatSection}>
          <Text style={s.sectionTitle}>私密对话</Text>
          {!isLoggedIn ? (
            <Text style={s.hint}>登录后可私聊卖家</Text>
          ) : isSeller ? (
            <Pressable style={s.chatBtn} onPress={() => onChatList(itemId)}>
              <Text style={s.chatBtnText}>💬 查看买家咨询</Text>
            </Pressable>
          ) : (
            <Pressable style={s.chatBtn} onPress={async () => {
              // Try to get existing thread or create one
              const r = await apiGet(`/api/marketplace/items/${itemId}/chat/thread`);
              if (r.status === 0 && r.data) {
                onChat(r.data.id, itemId);
              } else {
                // Will create thread on first message
                onChat(0, itemId);
              }
            }}>
              <Text style={s.chatBtnText}>💬 联系卖家</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  body: { padding: 12, paddingBottom: 40 },

  heroImg: { height: 260, borderRadius: 14, backgroundColor: '#f1f5f9' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  dotActive: { backgroundColor: '#0f172a', width: 16 },

  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 14, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  priceBadge: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
  statusBadge: { fontSize: 12, color: '#fff', backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', fontWeight: '600' },
  soldBadge: { backgroundColor: '#94a3b8' },
  metaBadge: { fontSize: 12, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  info: { fontSize: 12, color: '#64748b' },
  desc: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  ownerActions: { marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#0f172a' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  chatSection: { marginTop: 8 },
  hint: { fontSize: 13, color: '#94a3b8' },
  chatBtn: { backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  chatBtnText: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
});
