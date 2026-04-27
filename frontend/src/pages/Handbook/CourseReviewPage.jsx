import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { listCourseReviews } from '../../api/handbook';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function CourseReviewPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: QK.courseReviews({ q }),
    queryFn: () => listCourseReviews({ q, page: 1, pageSize: 20 }),
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

        <div className="handbook-mini-list">
          {list.map((r) => (
            <Link key={r.id} to={`/about/freshman-guide/course-review/${r.id}`} className="handbook-mini-card">
              <div className="handbook-mini-title">
                {r.courseName} {r.teacher ? <span className="handbook-mini-sub-inline">· {r.teacher}</span> : null}
              </div>
              <div className="handbook-mini-sub">
                {isZh ? '评分' : 'Rating'}: {r.rating}
                {Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? ` · ${isZh ? '难度' : 'Difficulty'}: ${r.difficulty}` : ''}
                {` · ${isZh ? '评论' : 'Comments'}: ${r?.stats?.comments ?? 0}`}
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

