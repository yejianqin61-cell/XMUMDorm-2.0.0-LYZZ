import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { Toast } from '../../context/ToastContext';
import { getHandbookTabs, getHandbookTags, createHandbookArticle, uploadHandbookImage } from '@shared/api/handbook';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function HandbookEditor() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tab, setTab] = useState('freshman-guide');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft'); // draft | published
  const [tagIds, setTagIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabsQuery = useQuery({
    queryKey: QK.handbookTabs(),
    queryFn: getHandbookTabs,
    staleTime: 60 * 60 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const tagsQuery = useQuery({
    queryKey: QK.handbookTags(),
    queryFn: getHandbookTags,
    staleTime: 60 * 60 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const tabs = tabsQuery.data || [];
  const tags = tagsQuery.data || [];

  const toggleTag = (id) => {
    setTagIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) {
        Toast.error(isZh ? '最多选择 8 个标签' : 'Up to 8 tags');
        return prev;
      }
      return [...prev, id];
    });
  };

  const insertAtCursor = (text) => {
    try {
      const el = document.getElementById('handbook-editor-content');
      if (!el) {
        setContent((c) => c + text);
        return;
      }
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const next = content.slice(0, start) + text + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        el.focus();
        const p = start + text.length;
        el.setSelectionRange(p, p);
      });
    } catch {
      setContent((c) => c + text);
    }
  };

  const onUploadImage = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const out = await uploadHandbookImage(file);
      const url = out?.url || out?.data?.url;
      if (!url) throw new Error('上传失败');
      insertAtCursor(`\n\n![](${url})\n\n`);
      Toast.success(isZh ? '已插入图片' : 'Image inserted');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '上传失败' : 'Upload failed'));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!content.trim()) return false;
    if (!tab) return false;
    return true;
  }, [content, tab, title]);

  const onSubmit = async () => {
    if (!canSubmit) {
      Toast.error(isZh ? '请补全标题与正文' : 'Title & content required');
      return;
    }
    setLoading(true);
    try {
      const created = await createHandbookArticle({
        title: title.trim(),
        summary: summary.trim() || undefined,
        tab,
        content,
        status,
        tag_ids: tagIds,
      });
      Toast.success(isZh ? '已提交' : 'Saved');
      queryClient.invalidateQueries({ queryKey: ['handbook'] });
      const id = created?.id || created?.data?.id;
      navigate(id ? `/about/freshman-guide/a/${id}` : '/about/freshman-guide', { replace: true });
    } catch (e) {
      Toast.error(e?.message || (isZh ? '提交失败' : 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回' : '← Back'}
        </Link>
      </div>

      <div className="handbook-editor">
        <div className="handbook-editor-title">{isZh ? '投稿 / 发布' : 'Write'}</div>

        <div className="handbook-editor-row">
          <label className="handbook-editor-label">{isZh ? '标题' : 'Title'}</label>
          <input className="handbook-editor-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>

        <div className="handbook-editor-row">
          <label className="handbook-editor-label">{isZh ? '摘要（可选）' : 'Summary (optional)'}</label>
          <input className="handbook-editor-input" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} />
        </div>

        <div className="handbook-editor-grid">
          <div className="handbook-editor-row">
            <label className="handbook-editor-label">{isZh ? '栏目' : 'Tab'}</label>
            <select className="handbook-editor-select" value={tab} onChange={(e) => setTab(e.target.value)}>
              {tabs.filter((t) => t.slug !== 'all').map((t) => (
                <option key={t.slug} value={t.slug}>
                  {isZh ? (t.name_zh || t.slug) : (t.name_en || t.slug)}
                </option>
              ))}
            </select>
          </div>

          <div className="handbook-editor-row">
            <label className="handbook-editor-label">{isZh ? '状态' : 'Status'}</label>
            <select className="handbook-editor-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">{isZh ? '草稿' : 'Draft'}</option>
              <option value="published">{isZh ? '发布' : 'Published'}</option>
            </select>
          </div>
        </div>

        <div className="handbook-editor-row">
          <label className="handbook-editor-label">{isZh ? '正文（Markdown）' : 'Content (Markdown)'}</label>
          <div className="handbook-editor-toolbar">
            <label className={`handbook-btn handbook-btn--ghost ${loading ? 'is-disabled' : ''}`}>
              {isZh ? '插入图片' : 'Insert image'}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="handbook-file"
                onChange={(e) => onUploadImage(e.target.files?.[0])}
                disabled={loading}
              />
            </label>
            <button type="button" className="handbook-btn handbook-btn--ghost" onClick={() => insertAtCursor('\n\n## 小标题\n\n')}>
              {isZh ? '插入标题' : 'Heading'}
            </button>
            <button type="button" className="handbook-btn handbook-btn--ghost" onClick={() => insertAtCursor('\n\n- \n')}>
              {isZh ? '插入列表' : 'List'}
            </button>
          </div>
          <textarea
            id="handbook-editor-content"
            className="handbook-editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder={isZh ? '支持 Markdown；可插入无限图片。' : 'Markdown supported; unlimited images.'}
          />
        </div>

        <div className="handbook-editor-row">
          <label className="handbook-editor-label">{isZh ? '标签（可选）' : 'Tags (optional)'}</label>
          <div className="handbook-tagpool">
            {tags.map((t) => {
              const on = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`handbook-tag ${on ? 'is-on' : ''}`}
                  onClick={() => toggleTag(t.id)}
                >
                  {isZh ? (t.name_zh || t.slug) : (t.name_en || t.slug)}
                </button>
              );
            })}
            {tags.length === 0 ? <span className="handbook-tag-empty">{isZh ? '暂无标签（需管理员创建）' : 'No tags yet (admin)'}</span> : null}
          </div>
        </div>

        <div className="handbook-editor-actions">
          <button type="button" className="handbook-btn handbook-btn--primary" onClick={onSubmit} disabled={!canSubmit || loading}>
            {loading ? (isZh ? '提交中…' : 'Saving…') : (isZh ? '提交' : 'Submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HandbookEditor;

