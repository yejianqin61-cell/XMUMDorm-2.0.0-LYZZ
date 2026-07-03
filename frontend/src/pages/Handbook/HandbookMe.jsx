import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, GraduationCap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMyCourseReviews, getMySavedHandbookArticles } from '@shared/api/handbook';
import { QK } from '@shared/query/queryKeys';
import './Handbook.css';

function HandbookMe() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token } = useAuth();
  const tokenKey = token ? String(token).slice(0, 12) : 'anon';

  const [tab, setTab] = useState('saved'); // saved | reviews

  const savedQuery = useQuery({
    queryKey: QK.handbookMeSaved(tokenKey, 20),
    queryFn: () => getMySavedHandbookArticles({ page: 1, pageSize: 20 }),
    enabled: isLoggedIn && tab === 'saved',
    staleTime: 15 * 1000,
    select: (d) => d || { list: [], hasMore: false },
  });

  const myReviewsQuery = useQuery({
    queryKey: QK.handbookMeCourseReviews(tokenKey, 20),
    queryFn: () => getMyCourseReviews({ page: 1, pageSize: 20 }),
    enabled: isLoggedIn && tab === 'reviews',
    staleTime: 15 * 1000,
    select: (d) => d || { list: [], hasMore: false },
  });

  const savedList = useMemo(() => savedQuery.data?.list || [], [savedQuery.data]);
  const myReviewsList = useMemo(() => myReviewsQuery.data?.list || [], [myReviewsQuery.data]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回手册' : '← Back'}
        </Link>
      </div>

      <div className="handbook-collections">
        <div className="handbook-collections-title">{isZh ? '我的收藏' : 'My'}</div>

        {!isLoggedIn ? (
          <div className="handbook-empty" style={{ marginTop: 14 }}>
            <div className="handbook-empty-title">{isZh ? '需要登录' : 'Login required'}</div>
            <div className="handbook-empty-sub">{isZh ? '登录后才可以查看收藏与自己的课程点评。' : 'Please login.'}</div>
          </div>
        ) : (
          <>
            <div className="handbook-tabs" style={{ marginTop: 10 }}>
              <button
                type="button"
                className={`handbook-tab ${tab === 'saved' ? 'is-active' : ''}`}
                onClick={() => setTab('saved')}
              >
                <Bookmark size={16} aria-hidden style={{ marginRight: 8, verticalAlign: '-3px' }} />
                {isZh ? '我所收藏的文章' : 'Saved articles'}
              </button>
              <button
                type="button"
                className={`handbook-tab ${tab === 'reviews' ? 'is-active' : ''}`}
                onClick={() => setTab('reviews')}
              >
                <GraduationCap size={16} aria-hidden style={{ marginRight: 8, verticalAlign: '-3px' }} />
                {isZh ? '我发布过的课程点评' : 'My course reviews'}
              </button>
            </div>

            {tab === 'saved' ? (
              <div className="handbook-mini-list" style={{ marginTop: 10 }}>
                {savedList.map((a) => (
                  <Link key={a.id} to={`/about/freshman-guide/a/${a.id}`} className="handbook-mini-card">
                    <div className="handbook-mini-title">{a.title}</div>
                    {a.summary ? <div className="handbook-mini-sub">{a.summary}</div> : null}
                  </Link>
                ))}
                {!savedQuery.isFetching && savedList.length === 0 ? (
                  <div className="handbook-mini-empty">{isZh ? '暂无收藏文章' : 'No saved articles'}</div>
                ) : null}
              </div>
            ) : (
              <div className="handbook-mini-list" style={{ marginTop: 10 }}>
                {myReviewsList.map((r) => (
                  <Link key={r.id} to={`/about/freshman-guide/course-review/${r.id}`} className="handbook-mini-card">
                    <div className="handbook-mini-score">
                      {(r?.stats?.avgRating == null ? (isZh ? '暂无' : 'N/A') : Number(r.stats.avgRating).toFixed(2))}⭐
                    </div>
                    <div className="handbook-mini-title">{r.courseName}</div>
                    {r.teacher ? <div className="handbook-mini-sub">{r.teacher}</div> : null}
                    <div className="handbook-mini-sub">
                      {isZh ? '评分' : 'Rating'}: {r.rating}
                      {Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? ` · ${isZh ? '难度' : 'Difficulty'}: ${r.difficulty}` : ''}
                      {` · ${isZh ? '评分人数' : 'Votes'}: ${r?.stats?.ratingCount ?? 0}`}
                    </div>
                    {r.comment ? <div className="handbook-mini-sub" style={{ marginTop: 6 }}>{r.comment}</div> : null}
                  </Link>
                ))}
                {!myReviewsQuery.isFetching && myReviewsList.length === 0 ? (
                  <div className="handbook-mini-empty">{isZh ? '你还没有发布过课程点评' : 'No reviews yet'}</div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HandbookMe;

