import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPostTagsList } from '@shared/api/posts';
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

  const topTags = useMemo(() => {
    if (isLoggedIn && visibleQuery.data) return visibleTags;
    return tags.slice(0, 10);
  }, [isLoggedIn, visibleQuery.data, visibleTags, tags]);

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
            placeholder={isZh ? '搜索…' : 'Search…'}
            className="min-w-0 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
            type="search"
          />
        </form>
      </div>

      <div className="treehole-toolbar__tag-row mt-3 flex items-center gap-3">
        <div className="treehole-toolbar__tag-track relative flex-1 overflow-hidden treehole-tag-mask">
          <div className="treehole-tag-scroll flex items-center gap-6 overflow-x-auto whitespace-nowrap px-3 text-[14px]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => pickTagSlug(null)}
              className={`relative py-2 transition ${selectedSlug == null ? 'font-bold text-cyan-600 scale-105' : 'font-normal text-slate-400'}`}
            >
              {isZh ? '热门' : 'Popular'}
              {selectedSlug == null ? (
                <motion.span
                  layoutId="treeholeTagUnderline"
                  className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-cyan-500"
                />
              ) : null}
            </motion.button>

            {topTags.map((tag) => {
              const active = selectedSlug === tag.slug;
              return (
                <motion.button
                  key={tag.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickTagSlug(active ? null : tag.slug)}
                  className={`relative py-2 transition ${active ? 'font-bold text-cyan-600 scale-105' : 'font-normal text-slate-400'}`}
                >
                  {tagDisplay(tag)}
                  {active ? (
                    <motion.span
                      layoutId="treeholeTagUnderline"
                      className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-cyan-500"
                    />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        {isLoggedIn && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setTagPanelOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 shadow-sm backdrop-blur-md"
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
