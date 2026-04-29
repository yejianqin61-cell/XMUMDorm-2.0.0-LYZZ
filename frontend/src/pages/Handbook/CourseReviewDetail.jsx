import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { createCourseReviewComment, deleteCourseReviewComment, getCourseReviewDetail, listCourseReviewComments, rateCourseReview } from '../../api/handbook';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function CourseReviewDetail() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const reviewId = Number(id);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: QK.courseReviewDetail(reviewId),
    queryFn: () => getCourseReviewDetail(reviewId),
    enabled: Number.isFinite(reviewId) && reviewId > 0,
    staleTime: 15 * 1000,
  });

  const commentsQuery = useQuery({
    queryKey: QK.courseReviewComments(reviewId),
    queryFn: () => listCourseReviewComments(reviewId),
    enabled: Number.isFinite(reviewId) && reviewId > 0,
    staleTime: 15 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const r = detailQuery.data ?? null;
  const comments = useMemo(() => commentsQuery.data || [], [commentsQuery.data]);
  // 课程评价匿名：前端无法判断“是否是作者”，直接允许登录用户尝试评分；后端会拦截给自己评分
  const canRate = isLoggedIn;
  const avgRating = r?.stats?.avgRating == null ? null : Number(r.stats.avgRating);
  const ratingCount = Number(r?.stats?.ratingCount ?? 0);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide/course-review" className="handbook-back">
          {isZh ? '← 返回' : '← Back'}
        </Link>
      </div>

      <div className="handbook-detail">
        {!r && detailQuery.isPending ? <div className="handbook-loading">{isZh ? '加载中…' : 'Loading…'}</div> : null}
        {r ? (
          <>
            <h1 className="handbook-detail-title">{r.courseName}</h1>
            {r.teacher ? <p className="handbook-detail-summary">{r.teacher}</p> : null}
            <div className="handbook-detail-meta">
              <span className="handbook-meta-chip">{isZh ? '评分' : 'Rating'}: {r.rating}</span>
              {Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? (
                <span className="handbook-meta-chip">{isZh ? '难度' : 'Difficulty'}: {r.difficulty}</span>
              ) : null}
              <span className="handbook-meta-chip">
                {isZh ? '平均分' : 'Avg'}: {avgRating == null ? (isZh ? '暂无' : 'N/A') : avgRating.toFixed(2)} · {ratingCount}{' '}
                {isZh ? '人' : 'votes'}
              </span>
              {r?.term ? <span className="handbook-meta-chip">{isZh ? '学期' : 'Term'}: {r.term}</span> : null}
            </div>

            {r?.viewer?.canEdit ? (
              <div className="handbook-editor-actions" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="handbook-btn handbook-btn--ghost"
                  onClick={() => navigate(`/about/freshman-guide/course-review/${reviewId}/edit`)}
                >
                  {isZh ? '编辑' : 'Edit'}
                </button>
              </div>
            ) : null}

            <section className="handbook-rating">
              <div className="handbook-rating-title">{isZh ? '给这条课程评价评分' : 'Rate this review'}</div>
              <div className={`handbook-stars ${canRate ? '' : 'is-disabled'}`} aria-label={isZh ? '评分' : 'Rating'}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="handbook-star-btn"
                    disabled={!canRate || ratingSubmitting}
                    onClick={async () => {
                      if (!isLoggedIn) {
                        Toast.error(isZh ? '请先登录' : 'Please login');
                        return;
                      }
                      if (!canRate) {
                        Toast.error(isZh ? '不能给自己评分' : 'Cannot rate your own');
                        return;
                      }
                      setRatingSubmitting(true);
                      try {
                        await rateCourseReview(reviewId, n);
                        await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReview', reviewId] });
                        await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReviews'] });
                        Toast.success(isZh ? '评分成功' : 'Rated');
                      } catch (e) {
                        Toast.error(e?.message || (isZh ? '评分失败' : 'Failed'));
                      } finally {
                        setRatingSubmitting(false);
                      }
                    }}
                    aria-label={`${n}${isZh ? '星' : ' stars'}`}
                    title={`${n}${isZh ? '星' : ' stars'}`}
                  >
                    <Star size={18} className="handbook-star-icon" aria-hidden />
                  </button>
                ))}
              </div>
              <div className="handbook-rating-sub">
                {canRate ? (isZh ? '每个用户仅可评分一次。' : 'One rating per user.') : (isZh ? '发布者不能给自己评分。' : 'Author cannot rate.')}
              </div>
            </section>

            {r.comment ? (
              <section className="handbook-comments" style={{ marginTop: 16 }}>
                <div className="handbook-comments-title">{isZh ? '评价正文' : 'Review'}</div>
                <div className="handbook-comment">
                  <div className="handbook-comment-text" style={{ whiteSpace: 'pre-wrap' }}>{r.comment}</div>
                </div>
              </section>
            ) : null}

            <section className="handbook-comments">
              <div className="handbook-comments-title">{isZh ? '评论' : 'Comments'}</div>
              <div className="handbook-commentbox">
                <input
                  className="handbook-commentbox-input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={isZh ? '匿名评论…' : 'Comment anonymously…'}
                  maxLength={800}
                  disabled={commentSubmitting}
                />
                <button
                  type="button"
                  className="handbook-commentbox-send"
                  disabled={commentSubmitting || !commentText.trim()}
                  onClick={async () => {
                    if (!isLoggedIn) {
                      Toast.error(isZh ? '请先登录' : 'Please login');
                      return;
                    }
                    const text = commentText.trim();
                    if (!text) return;
                    setCommentSubmitting(true);
                    try {
                      await createCourseReviewComment(reviewId, { content: text });
                      setCommentText('');
                      Toast.success(isZh ? '评论成功' : 'Commented');
                      await queryClient.invalidateQueries({ queryKey: QK.courseReviewComments(reviewId) });
                      await queryClient.invalidateQueries({ queryKey: QK.courseReviews({ q: '', tags: [] }) });
                    } catch (e) {
                      Toast.error(e?.message || (isZh ? '评论失败' : 'Failed'));
                    } finally {
                      setCommentSubmitting(false);
                    }
                  }}
                >
                  {commentSubmitting ? (isZh ? '发送中…' : 'Sending…') : (isZh ? '发送' : 'Send')}
                </button>
              </div>
              {comments.length === 0 ? (
                <div className="handbook-comments-empty">{isZh ? '暂无评论' : 'No comments yet'}</div>
              ) : (
                <div className="handbook-comments-list">
                  {comments.map((c) => (
                    <div key={c.id} className="handbook-comment">
                      <div className="handbook-comment-meta">
                        <span className="handbook-comment-meta-left">
                          <span className="handbook-comment-author">{isZh ? '匿名' : 'Anonymous'}</span>
                          {c?.can_delete ? (
                            <button
                              type="button"
                              className="handbook-comment-delete"
                              onClick={async () => {
                                if (!window.confirm(isZh ? '确定删除这条评论吗？' : 'Delete this comment?')) return;
                                try {
                                  await deleteCourseReviewComment(reviewId, c.id);
                                  Toast.success(isZh ? '已删除' : 'Deleted');
                                  await queryClient.invalidateQueries({ queryKey: QK.courseReviewComments(reviewId) });
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default CourseReviewDetail;

