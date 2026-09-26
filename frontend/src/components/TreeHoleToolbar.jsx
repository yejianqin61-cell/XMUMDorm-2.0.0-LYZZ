import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PenLine, Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPostTagsList, getHotPostTags } from '@shared/api/posts';
import { getVisibleTags } from '@shared/api/tags';
import { QK } from '@shared/query/queryKeys';
import TreeHoleTagPanel from './TreeHoleTagPanel';
import './TreeHoleToolbar.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

function TreeHoleToolbar({ selectedSlug = null, onSelectTagSlug }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, token } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [keyword, setKeyword] = useState('');
  const [tagPanelOpen, setTagPanelOpen] = useState(false);

  const tagsQuery = useQuery({
    queryKey: QK.postTagsList(),
    queryFn: getPostTagsList,
    staleTime: POST_TAGS_STALE_MS,
    select: (data) => (Array.isArray(data) ? data : []),
  });
  const tags = tagsQuery.data ?? [];

  const visibleQuery = useQuery({
    queryKey: QK.postTagsVisible(),
    queryFn: getVisibleTags,
    enabled: isLoggedIn && !!token,
    staleTime: 2 * 60 * 1000,
  });
  const visibleTags = visibleQuery.data?.visible || [];

  // 游客端标签栏：按帖子热度（usage_count）排序的热门标签，双语名沿用全量标签
  const hotTagsQuery = useQuery({
    queryKey: QK.postHotTags(10),
    queryFn: () => getHotPostTags(10),
    staleTime: POST_TAGS_STALE_MS,
    select: (data) => (Array.isArray(data) ? data : []),
  });
  const hotTags = useMemo(() => {
    const order = new Map();
    (hotTagsQuery.data || []).forEach((t, i) => order.set(t.slug, i));
    if (order.size === 0) return tags.slice(0, 10);
    return tags
      .filter((t) => order.has(t.slug))
      .sort((a, b) => order.get(a.slug) - order.get(b.slug))
      .slice(0, 10);
  }, [hotTagsQuery.data, tags]);

  const topTags = useMemo(() => {
    if (isLoggedIn && visibleQuery.data) return visibleTags;
    return hotTags;
  }, [isLoggedIn, visibleQuery.data, visibleTags, hotTags]);

  const tagDisplay = (tag) => {
    const raw = isZh ? (tag.name_zh || tag.name_en) : (tag.name_en || tag.name_zh);
    return String(raw || '').replace(/^#\s*/g, '').trim();
  };

  const pickTagSlug = (slug) => {
    if (typeof onSelectTagSlug !== 'function') return;
    try {
      navigator.vibrate?.(8);
    } catch {
      // Vibration is optional.
    }
    onSelectTagSlug(slug);
  };

  const handleTagsChange = () => {
    queryClient.invalidateQueries({ queryKey: QK.postTagsVisible() });
    queryClient.invalidateQueries({ queryKey: QK.postTagsList() });
  };

  const onSubmitSearch = (event) => {
    event.preventDefault();
    const query = keyword.trim();
    navigate(`/posts/search${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div className="treehole-toolbar px-4 pt-5 pb-3">
      <div className="treehole-toolbar__actions">
        <form className="treehole-toolbar__search" onSubmit={onSubmitSearch}>
          <Search size={18} className="text-blue-600" aria-hidden />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label={isZh ? '搜索帖子' : 'Search posts'}
            className="min-w-0 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
            type="search"
          />
        </form>
      </div>

      <div className="treehole-toolbar__tag-row mt-3 flex items-center gap-2.5">
        <div className="treehole-toolbar__tag-track relative flex-1 overflow-hidden treehole-tag-mask">
          <div className="treehole-tag-scroll flex items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-1 text-[14px]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => pickTagSlug(null)}
              className={`shrink-0 rounded-full border-2 px-3 py-1.5 transition ${selectedSlug == null ? 'border-[#122E8A] bg-[#122E8A] font-bold text-white shadow-[2px_2px_0_0_#122E8A]' : 'border-transparent font-normal text-slate-500'}`}
            >
              {isZh ? '热门' : 'Popular'}
            </motion.button>

            {topTags.map((tag) => {
              const active = selectedSlug === tag.slug;
              return (
                <motion.button
                  key={tag.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pickTagSlug(active ? null : tag.slug)}
                  className={`shrink-0 rounded-full border-2 px-3 py-1.5 transition ${active ? 'border-[#122E8A] bg-[#122E8A] font-bold text-white shadow-[2px_2px_0_0_#122E8A]' : 'border-transparent font-normal text-slate-500'}`}
                >
                  {tagDisplay(tag)}
                </motion.button>
              );
            })}
          </div>
        </div>

        <Link
          to="/post/new"
          className="treehole-toolbar__publish"
          aria-label={isZh ? '发布帖子' : 'New post'}
          title={isZh ? '发布帖子' : 'New post'}
        >
          <PenLine size={18} strokeWidth={2.2} aria-hidden />
        </Link>

        {isLoggedIn && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setTagPanelOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#122E8A] bg-white text-[#122E8A] shadow-[2px_2px_0_0_#122E8A]"
            aria-label={isZh ? '管理标签' : 'Manage tags'}
          >
            <Plus size={18} />
          </motion.button>
        )}
      </div>

      <TreeHoleTagPanel
        open={tagPanelOpen}
        onClose={() => setTagPanelOpen(false)}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
}

export default TreeHoleToolbar;
