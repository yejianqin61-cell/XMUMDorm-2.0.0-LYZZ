import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet } from '../api/client';
import PostCard from '../components/PostCardWaterfall';
import PostDetailModal from './PostDetailModal';
import NewPostModal from './NewPostModal';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 8; const PAD = 10;
const CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;

const DUMMY_TAGS = ['热门','校园','生活','学习','美食','社团','二手','求助','吐槽','表白','活动'];

export default function TreeholeScreen() {
  const { isLoggedIn } = useAuth();
  const { lang, setLang } = useLanguage();
  const isZh = lang !== 'en';
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchPosts = useCallback(async (tag?: string | null) => {
    setLoading(true);
    const slug = tag ?? selectedTag;
    const qs = slug ? `&tagSlug=${encodeURIComponent(slug)}` : '';
    const data = await apiGet(`/api/posts?page=1&pageSize=30${qs}`);
    if (data.status === 0) setPosts(data.data?.list || []);
    setLoading(false);
  }, [selectedTag]);

  useEffect(() => { if (isLoggedIn) fetchPosts(null); }, [isLoggedIn, selectedTag]);

  const columns = useMemo(() => {
    const l: any[] = []; const r: any[] = [];
    posts.forEach((p, i) => { if (i % 2 === 0) l.push(p); else r.push(p); });
    return [l, r];
  }, [posts]);

  if (!isLoggedIn) return <View style={ss.centered}><Text style={ss.hint}>请先登录以查看树洞</Text></View>;

  return (
    <View style={ss.root}>
      <SafeAreaView style={ss.safe} edges={['top']}>
        {/* 头部 */}
        <View style={ss.header}>
          <View style={ss.headerLeft}>
            <Text style={ss.brand}>XMUM Dorm</Text>
            <Text style={ss.tagline}>Discover campus life</Text>
          </View>
          <View style={ss.headerRight}>
            <Pressable style={ss.iconBtn} onPress={() => setSearchOpen((v) => !v)}><Text style={ss.iconEmoji}>🔍</Text></Pressable>
            <View>
              <Pressable style={ss.iconBtn} onPress={() => setLangOpen((v) => !v)}><Text style={ss.iconEmoji}>🌐</Text></Pressable>
              {langOpen && (
                <View style={ss.langMenu}>
                  <Pressable style={[ss.langItem, lang === 'zh' && ss.langItemActive]} onPress={() => { setLang('zh'); setLangOpen(false); }}>
                    <Text style={[ss.langText, lang === 'zh' && ss.langTextActive]}>中文 {lang === 'zh' ? '●' : ''}</Text>
                  </Pressable>
                  <Pressable style={[ss.langItem, lang === 'en' && ss.langItemActive]} onPress={() => { setLang('en'); setLangOpen(false); }}>
                    <Text style={[ss.langText, lang === 'en' && ss.langTextActive]}>English {lang === 'en' ? '●' : ''}</Text>
                  </Pressable>
                </View>
              )}
            </View>
            <Pressable style={ss.iconBtn}><Text style={ss.iconEmoji}>🔔</Text></Pressable>
          </View>
        </View>

        {searchOpen && (
          <View style={ss.searchBar}><Text style={{ fontSize: 16 }}>🔍</Text><Text style={ss.hint}>搜索功能即将上线</Text></View>
        )}

        {/* Tag 工具栏 */}
        <View style={ss.tagWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tagRow}>
            {DUMMY_TAGS.map((t) => {
              const active = selectedTag === t;
              return (
                <Pressable key={t} onPress={() => setSelectedTag((p) => (p === t ? null : t))} style={[ss.tag, active && ss.tagActive]}>
                  <Text style={[ss.tagText, active && ss.tagTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={ss.tagPlus}><Text style={ss.tagPlusText}>+</Text></Pressable>
        </View>

        {/* 瀑布流 */}
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#94a3b8" /> : (
          <ScrollView contentContainerStyle={ss.waterfall} showsVerticalScrollIndicator={false}>
            {columns.map((col, ci) => (
              <View key={`c${ci}`} style={{ flex: 1, gap: GAP }}>
                {col.map((p: any) => <PostCard key={`p${p.id}`} post={p} cardWidth={CARD_W} onPress={() => setSelectedPost(p)} />)}
              </View>
            ))}
            {posts.length === 0 && <Text style={ss.empty}>暂无帖子</Text>}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* FAB */}
      <Pressable style={ss.fab} onPress={() => setShowNewPost(true)}><Text style={ss.fabText}>+</Text></Pressable>

      {selectedPost && <PostDetailModal post={selectedPost} visible={!!selectedPost} onClose={() => setSelectedPost(null)} onUpdated={() => { setSelectedPost(null); fetchPosts(); }} />}
      {showNewPost && <NewPostModal visible={showNewPost} onClose={() => setShowNewPost(false)} onCreated={() => { setShowNewPost(false); fetchPosts(); }} />}
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f7' },
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f7' },
  hint: { fontSize: 14, color: '#94a3b8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerLeft: { flex: 1 },
  brand: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  tagline: { fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 0.5, borderColor: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  iconEmoji: { fontSize: 16 },
  langMenu: { position: 'absolute', top: 44, right: 44, zIndex: 999, backgroundColor: '#fff', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, minWidth: 120 },
  langItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  langItemActive: { backgroundColor: '#f1f5f9' },
  langText: { fontSize: 14, color: '#475569' },
  langTextActive: { fontWeight: '700', color: '#0f172a' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5, borderColor: '#bae6fd', backgroundColor: 'rgba(255,255,255,0.8)' },
  tagWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 8, paddingVertical: 10, gap: 8 },
  tagRow: { gap: 10, paddingRight: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)' },
  tagActive: { backgroundColor: '#0f172a' },
  tagText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  tagTextActive: { color: '#fff', fontWeight: '600' },
  tagPlus: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, borderColor: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  tagPlusText: { fontSize: 18, color: '#64748b' },
  waterfall: { flexDirection: 'row', paddingHorizontal: PAD, gap: GAP, paddingBottom: 80 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 60, width: SCREEN_W - PAD * 2 },
  fab: { position: 'absolute', right: 20, bottom: 60, width: 52, height: 52, borderRadius: 26, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, zIndex: 100 },
  fabText: { color: '#fff', fontSize: 24, fontWeight: '300', marginTop: -1 },
});
