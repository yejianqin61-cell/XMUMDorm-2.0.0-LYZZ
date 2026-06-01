import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Globe, Bell, Plus, ChevronUp } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPostList, getPostTagsList } from '../api/posts';
import { getVisibleTags } from '../api/tags';
import PostCard from '../components/PostCardWaterfall';
import TreeholeSkeletonCard from '../components/TreeholeSkeletonCard';
import PostDetailModal from './PostDetailModal';
import NewPostModal from './NewPostModal';
import { TREEHOLE } from '../theme/treehole';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = TREEHOLE.colGap;
const PAD = TREEHOLE.pad;
const CARD_W = (SCREEN_W - PAD * 2 - GAP) / 2;

type TagItem = { id: number; slug: string; name_zh?: string; name_en?: string };

function mergePostsById(existing: any[], incoming: any[]) {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const p of incoming) {
    if (p?.id == null || seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

export default function TreeholeScreen() {
  const { isLoggedIn } = useAuth();
  const { lang, setLang } = useLanguage();
  const isZh = lang !== 'en';
  const scrollRef = useRef<ScrollView>(null);
  const fetchingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTagSlug, setSelectedTagSlug] = useState<string | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [showTopBtn, setShowTopBtn] = useState(false);

  const tagDisplay = useCallback(
    (t: TagItem) => {
      const raw = isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
      return String(raw || '').replace(/^#\s*/g, '').trim();
    },
    [isZh]
  );

  useEffect(() => {
    (async () => {
      try {
        if (isLoggedIn) {
          const data = await getVisibleTags();
          const visible = data?.visible || [];
          if (visible.length) {
            setTags(visible);
            return;
          }
        }
        const list = await getPostTagsList();
        setTags(Array.isArray(list) ? list.slice(0, 10) : []);
      } catch {
        setTags([]);
      }
    })();
  }, [isLoggedIn]);

  const fetchPosts = useCallback(
    async (pageNum = 1, slug: string | null = selectedTagSlug, append = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await getPostList({
          page: pageNum,
          pageSize: 10,
          ...(slug ? { tagSlug: slug } : {}),
        });
        const list = data?.list || [];
        setPosts((prev) => (append ? mergePostsById(prev, list) : list));
        const more = !!data?.hasMore;
        setHasMore(more);
        hasMoreRef.current = more;
        setPage(pageNum);
        pageRef.current = pageNum;
      } catch {
        if (!append) setPosts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    [selectedTagSlug]
  );

  useEffect(() => {
    fetchPosts(1, selectedTagSlug, false);
  }, [selectedTagSlug, fetchPosts]);

  const columns = useMemo(() => {
    const left: any[] = [];
    const right: any[] = [];
    posts.forEach((p, i) => {
      if (i % 2 === 0) left.push(p);
      else right.push(p);
    });
    return [left, right];
  }, [posts]);

  const pickTag = (slug: string | null) => {
    setSelectedTagSlug((prev) => (prev === slug ? null : slug));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowTopBtn(y > 480);
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 800) {
      if (hasMoreRef.current && !fetchingRef.current) {
        fetchPosts(pageRef.current + 1, selectedTagSlug, true);
      }
    }
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <View style={ss.root}>
      <LinearGradient
        colors={['rgba(34,211,238,0.18)', 'rgba(16,185,129,0.16)', TREEHOLE.pageBg]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={ss.safe} edges={['top']}>
        {/* Toolbar — 对齐 Web TreeHoleToolbar */}
        <View style={ss.toolbar}>
          <View style={ss.brandBlock}>
            <Text style={ss.brand}>XMUM Dorm</Text>
            <Text style={ss.tagline}>Discover campus life</Text>
          </View>

          <View style={ss.toolbarActions}>
            {searchOpen ? (
              <View style={ss.searchExpanded}>
                <Search size={18} color="#2563eb" strokeWidth={2.2} />
                <TextInput
                  value={keyword}
                  onChangeText={setKeyword}
                  placeholder={isZh ? '搜索…' : 'Search…'}
                  placeholderTextColor="#94a3b8"
                  style={ss.searchInput}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    /* TODO: 搜索页 */
                    setSearchOpen(false);
                  }}
                />
              </View>
            ) : (
              <Pressable style={ss.iconBtn} onPress={() => setSearchOpen(true)}>
                <Search size={18} color="#2563eb" strokeWidth={2.2} />
              </Pressable>
            )}

            <View>
              <Pressable style={ss.iconBtn} onPress={() => setLangOpen((v) => !v)}>
                <Globe size={18} color="#475569" strokeWidth={2.2} />
              </Pressable>
              {langOpen && (
                <View style={ss.langMenu}>
                  <Pressable
                    style={[ss.langItem, lang === 'zh' && ss.langItemActive]}
                    onPress={() => { setLang('zh'); setLangOpen(false); }}
                  >
                    <Text style={[ss.langText, lang === 'zh' && ss.langTextActive]}>
                      中文 {lang === 'zh' ? '●' : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[ss.langItem, lang === 'en' && ss.langItemActive]}
                    onPress={() => { setLang('en'); setLangOpen(false); }}
                  >
                    <Text style={[ss.langText, lang === 'en' && ss.langTextActive]}>
                      English {lang === 'en' ? '●' : ''}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <Pressable style={ss.iconBtn}>
              <Bell size={18} color="#94a3b8" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {/* Tag bar — 对齐 Web 下划线选中态 */}
        <View style={ss.tagBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tagScroll}>
            <Pressable onPress={() => pickTag(null)} style={ss.tagItem}>
              <Text style={[ss.tagLabel, selectedTagSlug == null && ss.tagLabelActive]}>
                {isZh ? '热门' : 'Popular'}
              </Text>
              {selectedTagSlug == null ? <View style={ss.tagUnderline} /> : null}
            </Pressable>
            {tags.map((t) => {
              const active = selectedTagSlug === t.slug;
              return (
                <Pressable key={t.id} onPress={() => pickTag(t.slug)} style={ss.tagItem}>
                  <Text style={[ss.tagLabel, active && ss.tagLabelActive]}>{tagDisplay(t)}</Text>
                  {active ? <View style={ss.tagUnderline} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {isLoggedIn ? (
            <Pressable style={ss.tagPlus}>
              <Plus size={18} color="#64748b" strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

        {/* Feed */}
        {loading ? (
          <View style={ss.grid}>
            <View style={ss.column}>
              {[1, 2, 3].map((i) => <TreeholeSkeletonCard key={`l${i}`} width={CARD_W} />)}
            </View>
            <View style={[ss.column, ss.columnRight]}>
              {[1, 2, 3].map((i) => <TreeholeSkeletonCard key={`r${i}`} width={CARD_W} />)}
            </View>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={ss.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={ss.grid}>
              <View style={ss.column}>
                {columns[0].map((p, i) => (
                  <PostCard key={`L-${p.id}-${i}`} post={p} cardWidth={CARD_W} onPress={setSelectedPost} />
                ))}
                {loadingMore ? (
                  <>
                    <TreeholeSkeletonCard key="skel-l-1" width={CARD_W} />
                    <TreeholeSkeletonCard key="skel-l-2" width={CARD_W} />
                  </>
                ) : null}
              </View>
              <View style={[ss.column, ss.columnRight]}>
                {columns[1].map((p, i) => (
                  <PostCard key={`R-${p.id}-${i}`} post={p} cardWidth={CARD_W} onPress={setSelectedPost} />
                ))}
                {loadingMore ? (
                  <>
                    <TreeholeSkeletonCard key="skel-r-1" width={CARD_W} />
                    <TreeholeSkeletonCard key="skel-r-2" width={CARD_W} />
                  </>
                ) : null}
              </View>
            </View>
            {posts.length === 0 && (
              <Text style={ss.empty}>{isZh ? '暂无帖子' : 'No posts yet'}</Text>
            )}
            {hasMore && !loadingMore && posts.length > 0 && (
              <Pressable
                style={ss.loadMore}
                onPress={() => {
                  if (!fetchingRef.current) fetchPosts(pageRef.current + 1, selectedTagSlug, true);
                }}
              >
                <Text style={ss.loadMoreText}>{isZh ? '加载更多' : 'Load more'}</Text>
              </Pressable>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {showTopBtn && (
        <Pressable style={ss.topBtn} onPress={scrollToTop}>
          <ChevronUp size={22} color="rgba(0, 91, 172, 0.98)" strokeWidth={2.4} />
        </Pressable>
      )}

      <Pressable style={ss.fab} onPress={() => setShowNewPost(true)}>
        <Plus size={28} color="#fff" strokeWidth={2.2} />
      </Pressable>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          visible={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={() => { setSelectedPost(null); fetchPosts(1, selectedTagSlug, false); }}
        />
      )}
      {showNewPost && (
        <NewPostModal
          visible={showNewPost}
          onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); fetchPosts(1, selectedTagSlug, false); }}
        />
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: TREEHOLE.pageBg },
  safe: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  brandBlock: { flex: 1, paddingRight: 12 },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(226, 232, 240, 1)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    minWidth: 160,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(191, 219, 254, 0.7)',
    backgroundColor: 'rgba(255,255,255,0.80)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  langMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 4,
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  langItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  langItemActive: { backgroundColor: '#f1f5f9' },
  langText: { fontSize: 14, color: '#475569' },
  langTextActive: { fontWeight: '700', color: '#0f172a' },
  tagBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    marginTop: 20,
    marginBottom: 6,
    gap: 8,
  },
  tagScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 8,
    paddingRight: 16,
  },
  tagItem: {
    paddingVertical: 8,
    position: 'relative',
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94a3b8',
  },
  tagLabelActive: {
    fontWeight: '700',
    color: '#0891b2',
    transform: [{ scale: 1.05 }],
  },
  tagUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#06b6d4',
  },
  tagPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(226, 232, 240, 1)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: TREEHOLE.fabBottom + 24,
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'flex-start',
    paddingHorizontal: PAD,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  columnRight: {
    paddingTop: TREEHOLE.rightColOffset,
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 60,
    width: SCREEN_W - PAD * 2,
  },
  loadMore: {
    marginTop: 14,
    marginHorizontal: PAD,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 1)',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    color: 'rgba(15, 23, 42, 0.85)',
    letterSpacing: -0.3,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: TREEHOLE.fabBottom,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TREEHOLE.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: TREEHOLE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 100,
  },
  topBtn: {
    position: 'absolute',
    right: 86,
    bottom: TREEHOLE.fabBottom + 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    zIndex: 100,
  },
});
