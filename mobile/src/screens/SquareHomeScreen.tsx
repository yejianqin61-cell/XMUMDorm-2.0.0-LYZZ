import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, FlatList,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';
const { width: SW } = Dimensions.get('window');

interface Props {
  onTrendingDetail: (id: number, title: string) => void;
  onCampusPostDetail: (id: number) => void;
  onNewCampusPost: (tab?: string) => void;
  onClubs: () => void;
  onMarketplace: () => void;
  onErrands: () => void;
  onHandbook: () => void;
}

export default function SquareHomeScreen({ onTrendingDetail, onCampusPostDetail, onNewCampusPost, onClubs, onMarketplace, onErrands, onHandbook }: Props) {
  const [banners, setBanners] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [campusTab, setCampusTab] = useState<'school' | 'college'>('school');
  const [campusFeed, setCampusFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);
  const timerRef = useRef<any>(null);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      apiGet('/api/square/banners'),
      apiGet('/api/square/trending'),
      apiGet(`/api/square/campus-feed?tab=${campusTab}&page=1&pageSize=5`),
    ]).then(([b, t, c]) => {
      if (b.status === 0) setBanners(b.data || []);
      if (t.status === 0) setTrending((t.data || []).slice(0, 5));
      if (c.status === 0) setCampusFeed(c.data?.list || []);
      setLoading(false);
    });
  }, []);

  // Banner auto-scroll
  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  const loadCampusFeed = useCallback(async (tab: 'school' | 'college') => {
    setCampusTab(tab);
    const c = await apiGet(`/api/square/campus-feed?tab=${tab}&page=1&pageSize=5`);
    if (c.status === 0) setCampusFeed(c.data?.list || []);
  }, []);

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  const RANK_COLORS = ['#ef4444', '#f97316', '#eab308', '#94a3b8', '#94a3b8'];

  const GRID_ITEMS = [
    { key: 'club', icon: '🏛️', label: '社团', color: '#ede9fe', onPress: onClubs },
    { key: 'handbook', icon: '📘', label: '一站通', color: '#dbeafe', onPress: onHandbook },
    { key: 'errands', icon: '🏃', label: '跑腿', color: '#fef3c7', onPress: onErrands },
    { key: 'marketplace', icon: '🛒', label: '二手', color: '#fce7f3', onPress: onMarketplace },
  ];

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🏛️ 广场</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" />
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          {/* ── Banner ── */}
          {banners.length > 0 && (
            <View style={s.bannerWrap}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
                  setBannerIdx(idx);
                }}
                contentOffset={{ x: bannerIdx * SW, y: 0 }}
              >
                {banners.map((b) => (
                  <View key={b.id} style={[s.bannerItem, { width: SW - 24 }]}>
                    <Image source={{ uri: prefixImg(b.image_url) }} style={s.bannerImg} />
                    <View style={s.bannerOverlay}>
                      <Text style={s.bannerTitle}>{b.title}</Text>
                      {b.subtitle ? <Text style={s.bannerSubtitle}>{b.subtitle}</Text> : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
              {banners.length > 1 && (
                <View style={s.dots}>
                  {banners.map((_, i) => (
                    <View key={i} style={[s.dot, i === bannerIdx && s.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Trending Topics ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>🔥 热门话题</Text>
            </View>
            {trending.map((t, i) => (
              <Pressable key={t.id} style={s.trendingRow} onPress={() => onTrendingDetail(t.id, t.title)}>
                <Text style={[s.trendingRank, { color: RANK_COLORS[i] || '#94a3b8' }]}>
                  {i + 1}
                </Text>
                <View style={s.trendingInfo}>
                  <Text style={s.trendingTitle} numberOfLines={1}>{t.title}</Text>
                  {t.description ? <Text style={s.trendingDesc} numberOfLines={1}>{t.description}</Text> : null}
                </View>
                <Text style={s.trendingCount}>{t.post_count || 0} 讨论</Text>
              </Pressable>
            ))}
            {trending.length === 0 && <Text style={s.emptyHint}>暂无热门话题</Text>}
          </View>

          {/* ── Grid Shortcuts ── */}
          <View style={s.grid}>
            {GRID_ITEMS.map((item) => (
              <Pressable key={item.key} style={[s.gridItem, { backgroundColor: item.color }]} onPress={item.onPress} disabled={item.disabled}>
                <Text style={s.gridIcon}>{item.icon}</Text>
                <Text style={s.gridLabel}>{item.label}</Text>
                {item.disabled && <Text style={s.gridBadge}>即将</Text>}
              </Pressable>
            ))}
          </View>

          {/* ── Campus Feed ── */}
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>📢 校园动态</Text>
              {isLoggedIn && (
                <Pressable onPress={() => onNewCampusPost(campusTab)}>
                  <Text style={s.postBtn}>+ 发布</Text>
                </Pressable>
              )}
            </View>
            {/* Tab toggle */}
            <View style={s.tabRow}>
              <Pressable
                style={[s.tab, campusTab === 'school' && s.tabActive]}
                onPress={() => loadCampusFeed('school')}
              >
                <Text style={[s.tabText, campusTab === 'school' && s.tabTextActive]}>学校公告</Text>
              </Pressable>
              <Pressable
                style={[s.tab, campusTab === 'college' && s.tabActive]}
                onPress={() => loadCampusFeed('college')}
              >
                <Text style={[s.tabText, campusTab === 'college' && s.tabTextActive]}>学院通知</Text>
              </Pressable>
            </View>
            {campusFeed.map((p) => (
              <Pressable key={p.id} style={s.campusCard} onPress={() => onCampusPostDetail(p.id)}>
                <View style={s.campusOrgRow}>
                  {p.organization?.avatar ? (
                    <Image source={{ uri: prefixImg(p.organization.avatar) }} style={s.orgAvatar} />
                  ) : (
                    <View style={[s.orgAvatar, s.orgAvatarPlace]}><Text>🏫</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.orgName}>{p.organization?.name || '未知组织'}</Text>
                      <Text style={s.verifiedBadge}>✓ 认证</Text>
                    </View>
                    <Text style={s.campusTime}>{fmtTime(p.created_at)}</Text>
                  </View>
                </View>
                <Text style={s.campusTitle}>{p.title}</Text>
                {p.content ? <Text style={s.campusContent} numberOfLines={2}>{p.content}</Text> : null}
                {p.images?.[0] && (
                  <Image source={{ uri: prefixImg(p.images[0].url) }} style={s.campusImg} />
                )}
              </Pressable>
            ))}
            {campusFeed.length === 0 && <Text style={s.emptyHint}>暂无校园动态</Text>}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function fmtTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return d.toLocaleDateString();
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  body: { paddingBottom: 40 },

  // Banner
  bannerWrap: { marginTop: 12, marginHorizontal: 12 },
  bannerItem: { borderRadius: 16, overflow: 'hidden', height: 160, backgroundColor: '#e2e8f0' },
  bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  dotActive: { backgroundColor: '#0f172a', width: 16 },

  // Section
  section: { marginTop: 20, marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  postBtn: { fontSize: 14, color: '#2563eb', fontWeight: '600' },

  // Trending
  trendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  trendingRank: { fontSize: 18, fontWeight: '900', width: 28, textAlign: 'center' },
  trendingInfo: { flex: 1, marginLeft: 10 },
  trendingTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  trendingDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  trendingCount: { fontSize: 12, color: '#94a3b8' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, marginTop: 16, gap: 10 },
  gridItem: { width: (SW - 34) / 2, borderRadius: 14, padding: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  gridIcon: { fontSize: 28 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  gridBadge: { position: 'absolute', top: 8, right: 8, fontSize: 10, color: '#fff', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 2, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#0f172a', fontWeight: '700' },

  // Campus cards
  campusCard: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  campusOrgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  orgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9' },
  orgAvatarPlace: { justifyContent: 'center', alignItems: 'center' },
  orgName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  verifiedBadge: { fontSize: 10, color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  campusTime: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  campusTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  campusContent: { fontSize: 13, color: '#475569', lineHeight: 19 },
  campusImg: { width: '100%', height: 160, borderRadius: 10, marginTop: 8, backgroundColor: '#f1f5f9' },

  emptyHint: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 20 },
});
