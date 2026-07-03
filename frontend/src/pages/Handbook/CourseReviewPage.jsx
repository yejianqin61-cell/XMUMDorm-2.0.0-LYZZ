import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { listCourseReviews } from '@shared/api/handbook';
import { QK } from '@shared/query/queryKeys';
import './Handbook.css';

function CourseReviewPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [q, setQ] = useState('');
  const [tags, setTags] = useState([]);

  const query = useQuery({
    queryKey: QK.courseReviews({ q, tags }),
    queryFn: () => listCourseReviews({ q, tags, page: 1, pageSize: 20 }),
    staleTime: 15 * 1000,
    select: (d) => d || { list: [], hasMore: false },
  });

  const list = useMemo(() => query.data?.list || [], [query.data]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回' : '← Back'}
        </Link>
      </div>

      <div className="handbook-collections">
        <div className="handbook-collections-title">{isZh ? '课程测评' : 'Course reviews'}</div>

        <div className="handbook-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="handbook-search-input"
            placeholder={isZh ? '搜索课程/老师…' : 'Search course/teacher…'}
          />
          <button type="button" className="handbook-search-go" onClick={() => query.refetch()}>
            {isZh ? '搜索' : 'Go'}
          </button>
        </div>

        <div className="handbook-filter-row">
          <button
            type="button"
            className={`handbook-filter-chip ${tags.length === 0 ? 'is-on' : ''}`}
            onClick={() => setTags([])}
          >
            {isZh ? '全部' : 'All'}
          </button>
          {['MPU', 'GE', 'ME', 'required', 'final', 'no final'].map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`handbook-filter-chip ${on ? 'is-on' : ''}`}
                onClick={() => {
                  setTags((prev) => {
                    const cur = Array.isArray(prev) ? prev : [];
                    if (cur.includes(t)) return cur.filter((x) => x !== t);
                    return [...cur, t];
                  });
                }}
              >
                {t}
              </button>
            );
          })}
          <button type="button" className="handbook-filter-refresh" onClick={() => query.refetch()}>
            {isZh ? '筛选' : 'Filter'}
          </button>
        </div>

        <div className="handbook-mini-list">
          {list.map((r) => (
            <Link key={r.id} to={`/about/freshman-guide/course-review/${r.id}`} className="handbook-mini-card">
              <div className="handbook-mini-score">
                {(r?.stats?.avgRating == null ? (isZh ? '暂无' : 'N/A') : Number(r.stats.avgRating).toFixed(2))}⭐
              </div>
              {r?.term ? (
                <div className="handbook-mini-score-sub" aria-label={isZh ? '学期' : 'Term'}>
                  {String(r.term)}
                </div>
              ) : null}
              <div className="handbook-mini-title">{r.courseName}</div>
              {r.teacher ? <div className="handbook-mini-sub">{r.teacher}</div> : null}
              <div className="handbook-mini-sub">
                {isZh ? '评分' : 'Rating'}: {r.rating}
                {Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? ` · ${isZh ? '难度' : 'Difficulty'}: ${r.difficulty}` : ''}
                {` · ${isZh ? '评论' : 'Comments'}: ${r?.stats?.comments ?? 0}`}
                {` · ${isZh ? '评分人数' : 'Votes'}: ${r?.stats?.ratingCount ?? 0}`}
              </div>
              {r.comment ? <div className="handbook-mini-sub" style={{ marginTop: 6 }}>{r.comment}</div> : null}
            </Link>
          ))}
        </div>

        {!query.isFetching && list.length === 0 ? (
          <div className="handbook-mini-empty">{isZh ? '暂无课程测评' : 'No reviews yet'}</div>
        ) : null}
      </div>
    </div>
  );
}

export default CourseReviewPage;

