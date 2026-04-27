import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import {
  bumpHandbookShare,
  createHandbookComment,
  getHandbookArticleDetail,
  listHandbookComments,
  toggleHandbookLike,
} from '../../api/handbook';
import { Bookmark, Eye, FilePlus2, Heart, Share2 } from 'lucide-react';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function extractHeadings(md) {
  const s = String(md || '');
  const lines = s.split(/\r?\n/);
  const hs = [];
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\s+#+\s*$/, '').trim();
    if (!text) continue;
    hs.push({ level, text });
  }
  return hs;
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    // 兼容旧版 WebView：避免使用 Unicode property escapes（\p{L}）
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function HandbookArticleDetail() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token, isLoggedIn } = useAuth();
  const tokenKey = token ?? 'guest';
  const queryClient = useQueryClient();
  const { id } = useParams();
  const articleId = Number(id);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: QK.handbookArticleDetail(articleId, tokenKey),
    queryFn: () => getHandbookArticleDetail(articleId),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 30 * 1000,
  });

  const commentsQuery = useQuery({
    queryKey: QK.handbookArticleComments(articleId),
    queryFn: () => listHandbookComments(articleId),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 15 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const a = detailQuery.data ?? null;
  const headings = useMemo(() => extractHeadings(a?.content), [a?.content]);
  const toc = useMemo(() => {
    const used = new Map();
    return headings.map((h) => {
      const base = slugify(h.text) || 'sec';
      const n = (used.get(base) || 0) + 1;
      used.set(base, n);
      const id = n === 1 ? base : `${base}-${n}`;
      return { ...h, id };
    });
  }, [headings]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回列表' : '← Back'}
        </Link>
      </div>

      {!a && detailQuery.isPending ? (
        <div className="handbook-loading">{isZh ? '加载中…' : 'Loading…'}</div>
      ) : null}

      {detailQuery.isError ? (
        <div className="handbook-error">{isZh ? '加载失败' : 'Failed to load'}</div>
      ) : null}

      {a ? (
        <article className="handbook-detail">
          {a.cover ? (
            <div className="handbook-detail-cover">
              <img src={a.cover} alt="" />
            </div>
          ) : null}

          <h1 className="handbook-detail-title">{a.title}</h1>
          {a.summary ? <p className="handbook-detail-summary">{a.summary}</p> : null}

          <div className="handbook-detail-meta">
            <span className="handbook-meta-chip">{a.tab}</span>
            <span className="handbook-meta-num" aria-label={isZh ? '浏览量' : 'Views'}>
              <Eye size={17} aria-hidden />
              {a?.stats?.views ?? 0}
            </span>
            <span className="handbook-meta-num" aria-label={isZh ? '点赞' : 'Likes'}>
              <Heart size={17} aria-hidden />
              {a?.stats?.likes ?? 0}
            </span>
            <span className="handbook-meta-num" aria-label={isZh ? '收藏' : 'Saves'}>
              <Bookmark size={17} aria-hidden />
              {a?.stats?.saves ?? 0}
            </span>
          </div>

          <div className="handbook-actions">
            <button
              type="button"
              className={`handbook-action-btn ${a?.viewer?.liked ? 'is-on' : ''}`}
              onClick={async () => {
                if (!isLoggedIn) {
                  Toast.error(isZh ? '请先登录' : 'Please login');
                  return;
                }
                const prevLiked = !!a?.viewer?.liked;
                const prevLikes = Number(a?.stats?.likes ?? 0);
                const optimisticLiked = !prevLiked;
                const optimisticLikes = optimisticLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);
                queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                  if (!old) return old;
                  return {
                    ...old,
                    viewer: { ...(old.viewer || {}), liked: optimisticLiked },
                    stats: { ...(old.stats || {}), likes: optimisticLikes },
                  };
                });
                try {
                  const out = await toggleHandbookLike(articleId);
                  const finalLiked = out?.liked ?? optimisticLiked;
                  if (finalLiked !== optimisticLiked) {
                    const finalLikes = finalLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);
                    queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        viewer: { ...(old.viewer || {}), liked: finalLiked },
                        stats: { ...(old.stats || {}), likes: finalLikes },
                      };
                    });
                  }
                } catch (e) {
                  queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                    if (!old) return old;
                    return {
                      ...old,
                      viewer: { ...(old.viewer || {}), liked: prevLiked },
                      stats: { ...(old.stats || {}), likes: prevLikes },
                    };
                  });
                  Toast.error(e?.message || (isZh ? '操作失败' : 'Failed'));
                }
              }}
            >
              <Heart size={18} aria-hidden />
              {isZh ? '点赞' : 'Like'}
            </button>
            <button
              type="button"
              className="handbook-action-btn"
              onClick={() => {
                window.location.assign('/about/freshman-guide/course-review/new');
              }}
            >
              <FilePlus2 size={18} aria-hidden />
              {isZh ? '新建课程评价' : 'New review'}
            </button>
            <button
              type="button"
              className="handbook-action-btn"
              onClick={async () => {
                try {
                  await bumpHandbookShare(articleId);
                  try {
                    const url = window.location.href;
                    await navigator.clipboard.writeText(url);
                    Toast.success(isZh ? '链接已复制' : 'Link copied');
                  } catch {
                    Toast.success(isZh ? '已记录分享' : 'Shared');
                  }
                } catch (e) {
                  Toast.error(e?.message || (isZh ? '分享失败' : 'Failed'));
                }
              }}
            >
              <Share2 size={18} aria-hidden />
              {isZh ? '分享' : 'Share'}
            </button>
          </div>

          {toc.length > 0 ? (
            <section className="handbook-toc" aria-label="Outline">
              <div className="handbook-toc-title">{isZh ? '大纲' : 'Outline'}</div>
              <div className="handbook-toc-list">
                {toc.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`handbook-toc-item level-${h.level}`}
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="handbook-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{
                h1: ({ children, ...props }) => {
                  const text = String(children?.[0] ?? '').trim();
                  const id = slugify(text);
                  return (
                    <h1 id={id} {...props}>
                      {children}
                    </h1>
                  );
                },
                h2: ({ children, ...props }) => {
                  const text = String(children?.[0] ?? '').trim();
                  const id = slugify(text);
                  return (
                    <h2 id={id} {...props}>
                      {children}
                    </h2>
                  );
                },
                h3: ({ children, ...props }) => {
                  const text = String(children?.[0] ?? '').trim();
                  const id = slugify(text);
                  return (
                    <h3 id={id} {...props}>
                      {children}
                    </h3>
                  );
                },
                img: ({ ...props }) => <img {...props} loading="lazy" decoding="async" />,
                a: ({ href, children, ...props }) => (
                  <a href={href} target="_blank" rel="noreferrer" {...props}>
                    {children}
                  </a>
                ),
              }}
            >
              {String(a.content || '')}
            </ReactMarkdown>
          </div>

          <section className="handbook-comments">
            <div className="handbook-comments-title">{isZh ? '评论' : 'Comments'}</div>
            <div className="handbook-commentbox">
              <input
                className="handbook-commentbox-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isZh ? '写下你的评论…' : 'Add a comment…'}
                maxLength={800}
                disabled={submitting}
              />
              <button
                type="button"
                className="handbook-commentbox-send"
                disabled={submitting || !commentText.trim()}
                onClick={async () => {
                  if (!isLoggedIn) {
                    Toast.error(isZh ? '请先登录' : 'Please login');
                    return;
                  }
                  const text = commentText.trim();
                  if (!text) return;
                  setSubmitting(true);
                  try {
                    await createHandbookComment(articleId, { content: text });
                    setCommentText('');
                    Toast.success(isZh ? '评论成功' : 'Commented');
                    await queryClient.invalidateQueries({ queryKey: QK.handbookArticleComments(articleId) });
                  } catch (e) {
                    Toast.error(e?.message || (isZh ? '评论失败' : 'Failed'));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? (isZh ? '发送中…' : 'Sending…') : (isZh ? '发送' : 'Send')}
              </button>
            </div>
            {(commentsQuery.data || []).length === 0 ? (
              <div className="handbook-comments-empty">{isZh ? '暂无评论' : 'No comments yet'}</div>
            ) : (
              <div className="handbook-comments-list">
                {(commentsQuery.data || []).map((c) => (
                  <div key={c.id} className="handbook-comment">
                    <div className="handbook-comment-meta">
                      <span className="handbook-comment-author">{c.author?.nickname ?? c.author?.username ?? 'Anonymous'}</span>
                      <span className="handbook-comment-time">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="handbook-comment-text">{c.content}</div>
                    {Array.isArray(c.replies) && c.replies.length > 0 ? (
                      <div className="handbook-replies">
                        {c.replies.map((r) => (
                          <div key={r.id} className="handbook-reply">
                            <div className="handbook-comment-meta">
                              <span className="handbook-comment-author">{r.author?.nickname ?? r.author?.username ?? 'Anonymous'}</span>
                              <span className="handbook-comment-time">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
                            </div>
                            <div className="handbook-comment-text">{r.content}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>
      ) : null}
    </div>
  );
}

export default HandbookArticleDetail;

