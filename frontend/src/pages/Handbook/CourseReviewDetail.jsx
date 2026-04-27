import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { getCourseReviewDetail, listCourseReviewComments } from '../../api/handbook';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function CourseReviewDetail() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { id } = useParams();
  const reviewId = Number(id);

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
              <span className="handbook-meta-chip">{isZh ? '难度' : 'Difficulty'}: {r.difficulty}</span>
            </div>

            <section className="handbook-comments">
              <div className="handbook-comments-title">{isZh ? '评论' : 'Comments'}</div>
              {comments.length === 0 ? (
                <div className="handbook-comments-empty">{isZh ? '暂无评论' : 'No comments yet'}</div>
              ) : (
                <div className="handbook-comments-list">
                  {comments.map((c) => (
                    <div key={c.id} className="handbook-comment">
                      <div className="handbook-comment-meta">
                        <span className="handbook-comment-author">{c.author?.nickname ?? c.author?.username ?? 'Anonymous'}</span>
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

