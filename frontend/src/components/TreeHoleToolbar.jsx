import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getPostTagsList, createPostTag, deletePostTag } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import './TreeHoleToolbar.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

/**
 * 树洞页：搜索栏 + 前 5 个标签 + 下拉全部标签（管理员可创建/删除）
 * @param {string | null} [selectedSlug] 当前筛选的标签 slug，null 为全部
 * @param {(slug: string | null) => void} [onSelectTagSlug] 选择/取消标签（不跳转，由父级刷新列表）
 */
function TreeHoleToolbar({ selectedSlug = null, onSelectTagSlug }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const tagBtnRefs = useRef(new Map());

  const tagsQuery = useQuery({
    queryKey: QK.postTagsList(),
    queryFn: getPostTagsList,
    staleTime: POST_TAGS_STALE_MS,
    select: (data) => (Array.isArray(data) ? data : []),
  });
  const tags = tagsQuery.data ?? [];
  const loadingTags = tagsQuery.isPending;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, [open]);

  const firstFive = tags.slice(0, 5);
  const firstFiveBySlug = useMemo(() => {
    const m = new Map();
    for (const t of firstFive) m.set(t.slug, t);
    return m;
  }, [firstFive]);

  const tagDisplay = (t) => (isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh));

  const pickTagSlug = (slug) => {
    if (typeof onSelectTagSlug !== 'function') return;
    onSelectTagSlug(slug);
  };

  const onBarTagClick = (t) => {
    if (typeof onSelectTagSlug !== 'function') return;
    if (selectedSlug === t.slug) pickTagSlug(null);
    else pickTagSlug(t.slug);
  };

  const onDropdownTagClick = (t) => {
    pickTagSlug(t.slug);
    setOpen(false);
  };

  // 选中标签后，自动把它平滑滚到最左侧（虎扑频道栏体验）
  useEffect(() => {
    const slug = selectedSlug;
    const scroller = scrollRef.current;
    if (!scroller || !slug) return;
    // 只有前 5 个在横栏里，才需要滚动
    if (!firstFiveBySlug.has(slug)) return;
    const el = tagBtnRefs.current.get(slug);
    if (!el) return;

    // 目标：让该按钮左边贴住容器左边（留一点 padding）
    const padLeft = 8;
    const nextLeft = Math.max(0, el.offsetLeft - padLeft);
    scroller.scrollTo({ left: nextLeft, behavior: 'smooth' });
  }, [selectedSlug, firstFiveBySlug]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      Toast.error(isZh ? '请输入关键词' : 'Enter a keyword');
      return;
    }
    navigate(`/posts/search?q=${encodeURIComponent(q)}`);
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    const zh = nameZh.trim();
    const en = nameEn.trim();
    if (!zh || !en) {
      Toast.error(isZh ? '请填写中文与英文名称' : 'Fill in both Chinese and English names');
      return;
    }
    try {
      await createPostTag({ name_zh: zh, name_en: en });
      Toast.success(isZh ? '标签已创建' : 'Tag created');
      setNameZh('');
      setNameEn('');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: QK.postTagsList() });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteTag = async (t, ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const ok = window.confirm(
      isZh
        ? `确定删除标签「${tagDisplay(t)}」？帖子将自动解绑。`
        : `Delete tag "${tagDisplay(t)}"? Posts will be unlinked.`
    );
    if (!ok) return;
    try {
      await deletePostTag(t.id);
      Toast.success(isZh ? '已删除' : 'Deleted');
      queryClient.invalidateQueries({ queryKey: QK.postTagsList() });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="treehole-toolbar" ref={wrapRef}>
      <form
        className="treehole-toolbar-search glass-search"
        onSubmit={onSearchSubmit}
        role="search"
      >
        <div className="treehole-toolbar-search-field">
          <input
            type="search"
            className="treehole-toolbar-search-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={isZh ? '搜索帖子…' : 'Search posts…'}
            enterKeyHint="search"
            aria-label={isZh ? '输入关键词搜索帖子' : 'Enter keywords to search posts'}
          />
        </div>
        <button
          type="submit"
          className="treehole-toolbar-search-submit"
          aria-label={isZh ? '搜索' : 'Search'}
        >
          <svg
            className="treehole-toolbar-search-submit-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.8 15.8 21 21"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      <div className="treehole-toolbar-tags-embed" role="navigation" aria-label={isZh ? '热门标签' : 'Popular tags'}>
        <div className="treehole-toolbar-tags-scroll" ref={scrollRef}>
          {loadingTags && firstFive.length === 0 ? (
            <span className="treehole-toolbar-tags-loading">{isZh ? '标签加载中…' : 'Loading tags…'}</span>
          ) : (
            firstFive.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`treehole-toolbar-tag-link ${selectedSlug === t.slug ? 'is-selected' : ''}`}
                onClick={() => onBarTagClick(t)}
                aria-pressed={selectedSlug === t.slug}
                ref={(node) => {
                  if (!t.slug) return;
                  if (node) tagBtnRefs.current.set(t.slug, node);
                  else tagBtnRefs.current.delete(t.slug);
                }}
              >
                {tagDisplay(t)}
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          className={`treehole-toolbar-more treehole-toolbar-more-embed ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={isZh ? '全部标签' : 'All tags'}
        >
          <span className="treehole-toolbar-chevron" aria-hidden />
        </button>
      </div>

      {open && (
        <div className="treehole-toolbar-dropdown" role="listbox">
          <div className="treehole-toolbar-dropdown-head">
            <span>{isZh ? '全部标签 All tags' : 'All tags 全部标签'}</span>
            {isAdmin && (
              <button
                type="button"
                className="treehole-toolbar-create-link"
                onClick={() => setCreateOpen((v) => !v)}
              >
                {isZh ? '+ 创建标签 Create' : '+ Create tag 创建'}
              </button>
            )}
          </div>
          {isAdmin && createOpen && (
            <form className="treehole-toolbar-create-form" onSubmit={handleCreateTag}>
              <input
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
                placeholder="中文名 Name (ZH)"
                className="treehole-toolbar-create-input"
              />
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="English name (EN)"
                className="treehole-toolbar-create-input"
              />
              <button type="submit" className="treehole-toolbar-create-submit">
                {isZh ? '提交 Submit' : 'Submit 提交'}
              </button>
            </form>
          )}
          <ul className="treehole-toolbar-dropdown-list">
            <li className="treehole-toolbar-dropdown-item treehole-toolbar-dropdown-item-all">
              <button
                type="button"
                className={`treehole-toolbar-dropdown-link treehole-toolbar-dropdown-tag-btn ${selectedSlug == null ? 'is-selected' : ''}`}
                onClick={() => {
                  pickTagSlug(null);
                  setOpen(false);
                }}
              >
                {isZh ? '全部帖子' : 'All posts'}
              </button>
            </li>
            {tags.map((t) => (
              <li key={t.id} className="treehole-toolbar-dropdown-item">
                <button
                  type="button"
                  className={`treehole-toolbar-dropdown-link treehole-toolbar-dropdown-tag-btn ${selectedSlug === t.slug ? 'is-selected' : ''}`}
                  onClick={() => onDropdownTagClick(t)}
                >
                  {tagDisplay(t)}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="treehole-toolbar-tag-delete"
                    onClick={(ev) => handleDeleteTag(t, ev)}
                    aria-label={isZh ? '删除标签' : 'Delete tag'}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {tags.length === 0 && !loadingTags && (
            <p className="treehole-toolbar-dropdown-empty">
              {isZh ? '暂无标签，请管理员创建。No tags yet.' : 'No tags yet. Ask an admin to create one.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TreeHoleToolbar;
