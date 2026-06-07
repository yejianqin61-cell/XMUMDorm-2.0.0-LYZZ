import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePosts, type PostItem } from '../hooks/usePosts';
import { usePostTags, type TagItem } from '../hooks/usePostTags';
import { useScrollToTop } from '../hooks/useScrollToTop';
import TreeholeToolbar from '../components/treehole/TreeholeToolbar';
import TreeholeTagBar from '../components/treehole/TreeholeTagBar';
import PostWaterfallGrid from '../components/treehole/PostWaterfallGrid';
import FloatingActions from '../components/treehole/FloatingActions';
import PostDetailModal from './PostDetailModal';
import NewPostModal from './NewPostModal';
import { TREEHOLE } from '../theme/treehole';

export default function TreeholeScreen() {
  const { isLoggedIn } = useAuth();
  const { lang, setLang } = useLanguage();
  const isZh = lang !== 'en';

  // Hooks
  const { posts, loading, loadingMore, hasMore, refresh, loadMore, fetchPosts } = usePosts(10);
  const { tags } = usePostTags(isLoggedIn);
  const { scrollRef, showTopBtn, onScroll, scrollToTop } = useScrollToTop(480);

  // Refs for infinite scroll
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const fetchingRef = useRef(false);

  // Local state
  const [selectedTagSlug, setSelectedTagSlug] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Tag display
  const tagDisplay = useCallback(
    (t: TagItem) => {
      const raw = isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
      return String(raw || '').replace(/^#\s*/g, '').trim();
    },
    [isZh]
  );

  // Tag selection
  const pickTag = useCallback(
    (slug: string | null) => {
      setSelectedTagSlug((prev) => (prev === slug ? null : slug));
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      refresh(slug);
    },
    [refresh, scrollRef]
  );

  // Scroll handler with infinite scroll
  const handleScroll = useCallback(
    (e: any) => {
      onScroll(e);
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 800) {
        if (hasMoreRef.current && !fetchingRef.current) {
          fetchingRef.current = true;
          loadMore().finally(() => { fetchingRef.current = false; });
        }
      }
    },
    [onScroll, loadMore]
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(34,211,238,0.18)', 'rgba(16,185,129,0.16)', TREEHOLE.pageBg]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <TreeholeToolbar
          searchOpen={searchOpen} setSearchOpen={setSearchOpen}
          keyword={keyword} setKeyword={setKeyword}
          langOpen={langOpen} setLangOpen={setLangOpen}
          lang={lang} setLang={setLang} isZh={isZh}
        />

        <TreeholeTagBar
          tags={tags}
          selectedTagSlug={selectedTagSlug}
          onPickTag={pickTag}
          isLoggedIn={isLoggedIn}
          tagDisplay={tagDisplay}
        />

        <PostWaterfallGrid
          posts={posts} loading={loading} loadingMore={loadingMore}
          hasMore={hasMore} scrollRef={scrollRef}
          onScroll={handleScroll} onPostPress={setSelectedPost}
          onLoadMore={() => { fetchingRef.current = true; loadMore().finally(() => { fetchingRef.current = false; }); }}
          isZh={isZh}
        />
      </SafeAreaView>

      <FloatingActions
        showTopBtn={showTopBtn}
        onScrollToTop={scrollToTop}
        onNewPost={() => setShowNewPost(true)}
      />

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          visible={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={() => { setSelectedPost(null); refresh(selectedTagSlug); }}
        />
      )}
      {showNewPost && (
        <NewPostModal
          visible={showNewPost}
          onClose={() => setShowNewPost(false)}
          onCreated={() => { setShowNewPost(false); refresh(selectedTagSlug); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TREEHOLE.pageBg },
  safe: { flex: 1 },
});
