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
  deleteHandbookComment,
  getHandbookArticleDetail,
  listHandbookComments,
  toggleHandbookCommentLike,
  toggleHandbookLike,
  toggleHandbookSave,
} from '../../api/handbook';
import { Bookmark, Eye, Heart, Share2 } from 'lucide-react';
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
  const { token, isLoggedIn, user, isAdmin } = useAuth();
  const tokenKey = token ?? 'guest';
  const queryClient = useQueryClient();
  const { id } = useParams();
  const articleId = Number(id);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const meId = user?.id ? Number(user.id) : 0;
  const [replyingTo, setReplyingTo] = useState(null); // { id, name }
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

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

  const canDeleteComment = (c) => {
    const uid = c?.user_id != null ? Number(c.user_id) : 0;
    return !!(isLoggedIn && (isAdmin || (meId > 0 && uid === meId)));
  };

  const optimisticInsertComment = ({ parentId, content }) => {
    const nowIso = new Date().toISOString();
    const tempId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const author = {
      username: user?.username ?? null,
      nickname: user?.nickname ?? null,
      avatar: user?.avatar ?? null,
    };
    const base = {
      id: tempId,
      article_id: articleId,
      user_id: meId || null,
      parent_id: parentId ?? null,
      content,
      created_at: nowIso,
      likes_count: 0,
      viewer_liked: false,
      author,
    };

    queryClient.setQueryData(QK.handbookArticleComments(articleId), (old) => {
      const arr = Array.isArray(old) ? old : [];
      if (!parentId) {
        return [
          ...arr,
          {
            ...base,
            parent_id: null,
            replies: [],
          },
        ];
      }
      // reply: append to parent's replies
      return arr.map((x) => {
        if (!x || x.id !== parentId) return x;
        const curReplies = Array.isArray(x.replies) ? x.replies : [];
        return {
          ...x,
          replies: [
            ...curReplies,
            {
              ...base,
              parent_id: parentId,
            },
          ],
        };
      });
    });

    return tempId;
  };

  const optimisticRollbackTo = (snapshot) => {
    queryClient.setQueryData(QK.handbookArticleComments(articleId), snapshot);
  };

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

          {a.authorInfo ? (
            <div className="handbook-author" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              {a.authorInfo.avatar ? (
                <img
                  src={a.authorInfo.avatar}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: 999, objectFit: 'cover' }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <div style={{ fontWeight: 600 }}>
                  {a.authorInfo.nickname || a.authorInfo.username || (isZh ? '作者' : 'Author')}
                </div>
                <div style={{ opacity: 0.78, fontSize: 12 }}>
                  {isZh ? '文章作者' : 'Article author'}
                </div>
              </div>
            </div>
          ) : null}

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
              className={`handbook-action-btn ${a?.viewer?.saved ? 'is-on' : ''}`}
              onClick={async () => {
                if (!isLoggedIn) {
                  Toast.error(isZh ? '请先登录' : 'Please login');
                  return;
                }
                const prevSaved = !!a?.viewer?.saved;
                const prevSaves = Number(a?.stats?.saves ?? 0);
                const optimisticSaved = !prevSaved;
                const optimisticSaves = optimisticSaved ? prevSaves + 1 : Math.max(0, prevSaves - 1);
                queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                  if (!old) return old;
                  return {
                    ...old,
                    viewer: { ...(old.viewer || {}), saved: optimisticSaved },
                    stats: { ...(old.stats || {}), saves: optimisticSaves },
                  };
                });
                try {
                  const out = await toggleHandbookSave(articleId);
                  const finalSaved = out?.saved ?? optimisticSaved;
                  if (finalSaved !== optimisticSaved) {
                    const finalSaves = finalSaved ? prevSaves + 1 : Math.max(0, prevSaves - 1);
                    queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        viewer: { ...(old.viewer || {}), saved: finalSaved },
                        stats: { ...(old.stats || {}), saves: finalSaves },
                      };
                    });
                  }
                } catch (e) {
                  queryClient.setQueryData(QK.handbookArticleDetail(articleId, tokenKey), (old) => {
                    if (!old) return old;
                    return {
                      ...old,
                      viewer: { ...(old.viewer || {}), saved: prevSaved },
                      stats: { ...(old.stats || {}), saves: prevSaves },
                    };
                  });
                  Toast.error(e?.message || (isZh ? '操作失败' : 'Failed'));
                }
              }}
            >
              <Bookmark size={18} aria-hidden />
              {isZh ? '收藏' : 'Save'}
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
                  const prev = queryClient.getQueryData(QK.handbookArticleComments(articleId));
                  optimisticInsertComment({ parentId: null, content: text });
                  setCommentText('');
                  try {
                    await createHandbookComment(articleId, { content: text });
                    Toast.success(isZh ? '评论成功' : 'Commented');
                    await queryClient.invalidateQueries({ queryKey: QK.handbookArticleComments(articleId) });
                  } catch (e) {
                    optimisticRollbackTo(prev);
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
                      <span className="handbook-comment-meta-left">
                        <span className="handbook-comment-author">{c.author?.nickname ?? c.author?.username ?? 'Anonymous'}</span>
                        <button
                          type="button"
                          className={`handbook-action-btn ${c?.viewer_liked ? 'is-on' : ''}`}
                          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          onClick={async () => {
                            if (!isLoggedIn) {
                              Toast.error(isZh ? '请先登录' : 'Please login');
                              return;
                            }
                            const prevLiked = !!c?.viewer_liked;
                            const prevCount = Number(c?.likes_count ?? 0);
                            const optimisticLiked = !prevLiked;
                            const optimisticCount = optimisticLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
                            queryClient.setQueryData(QK.handbookArticleComments(articleId), (old) => {
                              const arr = Array.isArray(old) ? old : [];
                              return arr.map((x) => (x?.id === c.id ? { ...x, viewer_liked: optimisticLiked, likes_count: optimisticCount } : x));
                            });
                            try {
                              const out = await toggleHandbookCommentLike(articleId, c.id);
                              const finalLiked = out?.liked ?? optimisticLiked;
                              if (finalLiked !== optimisticLiked) {
                                const finalCount = finalLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
                                queryClient.setQueryData(QK.handbookArticleComments(articleId), (old) => {
                                  const arr = Array.isArray(old) ? old : [];
                                  return arr.map((x) => (x?.id === c.id ? { ...x, viewer_liked: finalLiked, likes_count: finalCount } : x));
                                });
                              }
                            } catch (e) {
                              queryClient.setQueryData(QK.handbookArticleComments(articleId), (old) => {
                                const arr = Array.isArray(old) ? old : [];
                                return arr.map((x) => (x?.id === c.id ? { ...x, viewer_liked: prevLiked, likes_count: prevCount } : x));
                              });
                              Toast.error(e?.message || (isZh ? '操作失败' : 'Failed'));
                            }
                          }}
                        >
                          <Heart size={16} aria-hidden />
                          {c?.likes_count ?? 0}
                        </button>
                        <button
                          type="button"
                          className="handbook-action-btn"
                          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          onClick={() => {
                            if (!isLoggedIn) {
                              Toast.error(isZh ? '请先登录' : 'Please login');
                              return;
                            }
                            setReplyingTo({ id: c.id, name: c.author?.nickname ?? c.author?.username ?? (isZh ? '对方' : 'Someone') });
                            setReplyText('');
                          }}
                        >
                          {isZh ? '回复' : 'Reply'}
                        </button>
                        {canDeleteComment(c) ? (
                          <button
                            type="button"
                            className="handbook-comment-delete"
                            onClick={async () => {
                              if (!window.confirm(isZh ? '确定删除这条评论吗？' : 'Delete this comment?')) return;
                              try {
                                await deleteHandbookComment(articleId, c.id);
                                Toast.success(isZh ? '已删除' : 'Deleted');
                                await queryClient.invalidateQueries({ queryKey: QK.handbookArticleComments(articleId) });
                              } catch (e) {
                                Toast.error(e?.message || (isZh ? '删除失败' : 'Failed'));
                              }
                            }}
                          >
                            {isZh ? '删除' : 'Delete'}
                          </button>
                        ) : null}
                      </span>
                      <span className="handbook-comment-time">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="handbook-comment-text">{c.content}</div>

                    {replyingTo && replyingTo.id === c.id ? (
                      <div className="handbook-commentbox" style={{ marginTop: 10 }}>
                        <input
                          className="handbook-commentbox-input"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={isZh ? `回复 @${replyingTo.name}…` : `Reply @${replyingTo.name}…`}
                          maxLength={800}
                          disabled={replySubmitting}
                        />
                        <button
                          type="button"
                          className="handbook-commentbox-send"
                          disabled={replySubmitting || !replyText.trim()}
                          onClick={async () => {
                            const text = replyText.trim();
                            if (!text) return;
                            setReplySubmitting(true);
                            const prev = queryClient.getQueryData(QK.handbookArticleComments(articleId));
                            optimisticInsertComment({ parentId: c.id, content: text });
                            setReplyText('');
                            setReplyingTo(null);
                            try {
                              await createHandbookComment(articleId, { content: text, parent_id: c.id });
                              Toast.success(isZh ? '回复成功' : 'Replied');
                              await queryClient.invalidateQueries({ queryKey: QK.handbookArticleComments(articleId) });
                            } catch (e) {
                              optimisticRollbackTo(prev);
                              Toast.error(e?.message || (isZh ? '回复失败' : 'Failed'));
                            } finally {
                              setReplySubmitting(false);
                            }
                          }}
                        >
                          {replySubmitting ? (isZh ? '发送中…' : 'Sending…') : (isZh ? '发送' : 'Send')}
                        </button>
                        <button
                          type="button"
                          className="handbook-commentbox-send"
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          disabled={replySubmitting}
                        >
                          {isZh ? '取消' : 'Cancel'}
                        </button>
                      </div>
                    ) : null}

                    {Array.isArray(c.replies) && c.replies.length > 0 ? (
                      <div className="handbook-replies">
                        {c.replies.map((r) => (
                          <div key={r.id} className="handbook-reply">
                            <div className="handbook-comment-meta">
                              <span className="handbook-comment-meta-left">
                                <span className="handbook-comment-author">{r.author?.nickname ?? r.author?.username ?? 'Anonymous'}</span>
                                {canDeleteComment(r) ? (
                                  <button
                                    type="button"
                                    className="handbook-comment-delete"
                                    onClick={async () => {
                                      if (!window.confirm(isZh ? '确定删除这条评论吗？' : 'Delete this comment?')) return;
                                      try {
                                        await deleteHandbookComment(articleId, r.id);
                                        Toast.success(isZh ? '已删除' : 'Deleted');
                                        await queryClient.invalidateQueries({ queryKey: QK.handbookArticleComments(articleId) });
                                      } catch (e) {
                                        Toast.error(e?.message || (isZh ? '删除失败' : 'Failed'));
                                      }
                                    }}
                                  >
                                    {isZh ? '删除' : 'Delete'}
                                  </button>
                                ) : null}
                              </span>
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

