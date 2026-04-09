import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getPostTagsList, createPostTag, deletePostTag } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import './TreeHoleToolbar.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

/** 树洞页：搜索栏 + 前 5 个标签 + 下拉全部标签（管理员可创建/删除） */
function TreeHoleToolbar() {
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

  const tagDisplay = (t) => (isZh ? (t.name_zh || t.name_en) : (t.name_en || t.name_zh));

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
      <form className="treehole-toolbar-search" onSubmit={onSearchSubmit}>
        <input
          type="search"
          className="treehole-toolbar-search-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={isZh ? '搜索帖子关键词… Search posts…' : 'Search posts…'}
          enterKeyHint="search"
          aria-label={isZh ? '搜索帖子' : 'Search posts'}
        />
        <button type="submit" className="treehole-toolbar-search-btn">
          {isZh ? '搜索 Search' : 'Search'}
        </button>
      </form>

      <div className="treehole-toolbar-tag-row">
        <div className="treehole-toolbar-tags-scroll">
          {loadingTags && firstFive.length === 0 ? (
            <span className="treehole-toolbar-tags-loading">{isZh ? '标签加载中…' : 'Loading tags…'}</span>
          ) : (
            firstFive.map((t) => (
              <Link
                key={t.id}
                to={`/posts/tag/${encodeURIComponent(t.slug)}`}
                className="treehole-toolbar-tag-chip"
              >
                {tagDisplay(t)}
              </Link>
            ))
          )}
        </div>
        <button
          type="button"
          className={`treehole-toolbar-more ${open ? 'is-open' : ''}`}
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
            {tags.map((t) => (
              <li key={t.id} className="treehole-toolbar-dropdown-item">
                <Link to={`/posts/tag/${encodeURIComponent(t.slug)}`} className="treehole-toolbar-dropdown-link">
                  {tagDisplay(t)}
                </Link>
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
