import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Globe, Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPostTagsList } from '@shared/api/posts';
import { getVisibleTags } from '@shared/api/tags';
import { getUnreadSummary } from '@shared/api/notifications';
import { QK } from '@shared/query/queryKeys';
import TreeHoleTagPanel from './TreeHoleTagPanel';
import './TreeHoleToolbar.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;
const UNREAD_SUMMARY_STALE_MS = 10 * 1000;

/**
 * 树洞页：搜索栏 + 用户可见标签 + 延伸按钮管理标签
 * @param {string | null} [selectedSlug] 当前筛选的标签 slug，null 为全部
 * @param {(slug: string | null) => void} [onSelectTagSlug] 选择/取消标签（不跳转，由父级刷新列表）
 */
function TreeHoleToolbar({ selectedSlug = null, onSelectTagSlug }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, token } = useAuth();
  const { lang, setLang } = useLanguage();
  const isZh = lang !== 'en';
  const tokenKey = token ?? '';

  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [auraDismissed, setAuraDismissed] = useState(false);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  // 公开标签列表（用于非登录态回退 + 管理员增删后刷新）
  const tagsQuery = useQuery({
    queryKey: QK.postTagsList(),
    queryFn: getPostTagsList,
    staleTime: POST_TAGS_STALE_MS,
    select: (data) => (Array.isArray(data) ? data : []),
  });
  const tags = tagsQuery.data ?? [];

  // 登录用户：获取自定义可见性标签
  const visibleQuery = useQuery({
    queryKey: QK.postTagsVisible(),
    queryFn: getVisibleTags,
    enabled: isLoggedIn && !!token,
    staleTime: 2 * 60 * 1000,
  });
  const visibleTags = visibleQuery.data?.visible || [];
  const hiddenTags = visibleQuery.data?.hidden || [];

  // 展示的标签：登录用户用自定义可见标签，否则回退到前10个
  const topTags = useMemo(() => {
    if (isLoggedIn && visibleQuery.data) {
      return visibleTags;
    }
    return tags.slice(0, 10);
  }, [isLoggedIn, visibleQuery.data, visibleTags, tags]);

  const unreadSummaryQuery = useQuery({
    queryKey: ['notifications', 'unreadSummary', tokenKey],
    queryFn: getUnreadSummary,
    enabled: isLoggedIn && !!token,
    staleTime: UNREAD_SUMMARY_STALE_MS,
    refetchInterval: UNREAD_SUMMARY_STALE_MS,
    select: (d) => d || { social: 0, chat: 0, total: 0 },
  });
  const socialUnread = unreadSummaryQuery.data?.social || 0;
  const chatUnread = unreadSummaryQuery.data?.chat || 0;
  const totalUnread = unreadSummaryQuery.data?.total || 0;

  // 当未读发生变化时，允许 aura 再次出现（但点击后会平滑消退）
  useEffect(() => {
    setAuraDismissed(false);
  }, [socialUnread, chatUnread, totalUnread]);

  useEffect(() => {
    if (!searchOpen) return;
    // 打开时自动聚焦
    const t = setTimeout(() => {
      searchInputRef.current?.focus?.();
    }, 60);
    return () => clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e) => {
      const el = searchWrapRef.current;
      if (el && !el.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [searchOpen]);

  const tagDisplay = (t) => {
    const raw = isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh);
    return String(raw || '')
      .replace(/^#\s*/g, '')
      .trim();
  };

  const pickTagSlug = (slug) => {
    if (typeof onSelectTagSlug !== 'function') return;
    // very subtle haptic (supported devices only)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
    onSelectTagSlug(slug);
  };

  const handleTagsChange = () => {
    queryClient.invalidateQueries({ queryKey: QK.postTagsVisible() });
    queryClient.invalidateQueries({ queryKey: QK.postTagsList() });
  };

  const onSubmitSearch = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(`/posts/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  return (
    <div className="px-4 pt-5 pb-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">XMUM Dorm</div>
          <div className="mt-1 text-[12px] font-medium text-slate-400">Discover campus life</div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search (left of language), click outside to close */}
          <div className="relative" ref={searchWrapRef}>
            <AnimatePresence initial={false} mode="wait">
              {searchOpen ? (
                <motion.form
                  key="top-search-open"
                  onSubmit={onSubmitSearch}
                  initial={{ width: 44, opacity: 0.98 }}
                  animate={{ width: 176, opacity: 1 }}
                  exit={{ width: 44, opacity: 0.98 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  style={{ maxWidth: 'min(190px, 44vw)' }}
                  className="h-11"
                >
                  <div className="flex h-11 items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 shadow-sm backdrop-blur-xl">
                    <Search size={18} className="text-blue-600" aria-hidden />
                    <input
                      ref={searchInputRef}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setSearchOpen(false);
                      }}
                      placeholder={isZh ? '搜索…' : 'Search…'}
                      className="min-w-0 w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
                      type="search"
                    />
                  </div>
                </motion.form>
              ) : (
                <motion.button
                  key="top-search-closed"
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/70 bg-white/70 text-blue-700 shadow-sm backdrop-blur-md"
                  style={{ borderWidth: '0.5px' }}
                  aria-label={isZh ? '搜索' : 'Search'}
                >
                  <Search size={18} aria-hidden />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md active:scale-[0.98]"
              aria-label={isZh ? '切换语言' : 'Switch language'}
            >
              <Globe size={18} aria-hidden />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  className="absolute right-0 z-[9999] mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-xl backdrop-blur-xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLang('zh');
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm ${lang === 'zh' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                  >
                    中文
                    {lang === 'zh' ? <span className="text-emerald-600">●</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLang('en');
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm ${lang === 'en' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                  >
                    English
                    {lang === 'en' ? <span className="text-emerald-600">●</span> : null}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => navigate('/mailbox')}
            className={[
              'aura-bell',
              socialUnread > 0 ? 'is-social' : '',
              chatUnread > 0 ? 'is-chat' : '',
              auraDismissed ? 'is-dismissed' : '',
            ].filter(Boolean).join(' ')}
            aria-label={isZh ? '通知' : 'Notifications'}
            onMouseEnter={(e) => {
              try { e.currentTarget.classList.add('is-hover'); } catch {}
            }}
            onMouseLeave={(e) => {
              try { e.currentTarget.classList.remove('is-hover'); } catch {}
            }}
            onClickCapture={() => {
              // 点击进入通知页后：光效以淡出方式消退，而不是瞬间断掉
              setAuraDismissed(true);
            }}
          >
            <Bell size={18} aria-hidden />
            {totalUnread > 0 ? <span className="aura-badge">{totalUnread > 99 ? '99+' : String(totalUnread)}</span> : null}
          </button>
        </div>
      </div>

      {/* Tag bar: airy typography + masked edges + extend button */}
      <div className="mt-7 flex items-center gap-3">
        <div className="relative flex-1 overflow-hidden treehole-tag-mask">
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

            {topTags.map((t) => {
              const active = selectedSlug === t.slug;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickTagSlug(active ? null : t.slug)}
                  className={`relative py-2 transition ${active ? 'font-bold text-cyan-600 scale-105' : 'font-normal text-slate-400'}`}
                >
                  {tagDisplay(t)}
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

        {/* Extend button: manage visible tags */}
        {isLoggedIn && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setTagPanelOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-500 shadow-sm backdrop-blur-md shrink-0"
            aria-label={isZh ? '管理标签' : 'Manage tags'}
          >
            <Plus size={18} />
          </motion.button>
        )}
      </div>

      {/* Tag management panel */}
      <TreeHoleTagPanel
        open={tagPanelOpen}
        onClose={() => setTagPanelOpen(false)}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
}

export default TreeHoleToolbar;
