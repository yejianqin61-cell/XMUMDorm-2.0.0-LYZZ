import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Tag from '../../components/ui/Tag';
import FilterBar from '../../components/templates/FilterBar';
import { useLanguage } from '../../context/LanguageContext';
import { listCourseReviews } from '@shared/api/handbook';
import { QK } from '@shared/query/queryKeys';
import './Handbook.css';

function CourseReviewPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [q, setQ] = useState('');
  const [tags, setTags] = useState([]);
  const filterTags = ['MPU', 'GE', 'ME', 'required', 'final', 'no final'];

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

        <FilterBar
          className="handbook-course-review-filter"
          search={(
            <div className="handbook-course-review-filter-search">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="sm"
                compact
                placeholder={isZh ? '搜索课程 / 老师 / 学期' : 'Search course / teacher / term'}
              />
              <Button size="sm" onClick={() => query.refetch()}>
                {isZh ? '搜索' : 'Search'}
              </Button>
            </div>
          )}
          filters={(
            <>
              <Tag
                as="button"
                tone="neutral"
                variant={tags.length === 0 ? 'soft' : 'outline'}
                active={tags.length === 0}
                interactive
                onClick={() => setTags([])}
              >
                {isZh ? '全部' : 'All'}
              </Tag>
              {filterTags.map((tag) => {
                const active = tags.includes(tag);

                return (
                  <Tag
                    key={tag}
                    as="button"
                    tone="neutral"
                    variant={active ? 'soft' : 'outline'}
                    active={active}
                    interactive
                    onClick={() => {
                      setTags((prev) => {
                        const current = Array.isArray(prev) ? prev : [];
                        if (current.includes(tag)) return current.filter((item) => item !== tag);
                        return [...current, tag];
                      });
                    }}
                  >
                    {tag}
                  </Tag>
                );
              })}
            </>
          )}
          actions={(
            <Button variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
              {isZh ? '刷新结果' : 'Refresh'}
            </Button>
          )}
        />

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

