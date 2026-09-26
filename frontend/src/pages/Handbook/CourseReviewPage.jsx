import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Tag from '../../components/ui/Tag';
import FilterBar from '../../components/templates/FilterBar';
import { useLanguage } from '../../context/LanguageContext';
import { listCourseReviews } from '@shared/api/handbook';
import { flattenPages, nextPageParamFrom } from '@shared/utils/infiniteList';
import { QK } from '@shared/query/queryKeys';
import './Handbook.css';

/** 后端 pageSize 上限是 30，这里按页取 20 并逐页累加（线上已有 400+ 条） */
const PAGE_SIZE = 20;

function CourseReviewPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [q, setQ] = useState('');
  const [tags, setTags] = useState([]);
  const filterTags = ['MPU', 'GE', 'ME', 'required', 'final', 'no final'];

  // 必须用无限查询：接口是分页的（返回 hasMore），只取第一页会把列表硬顶在 20 条，
  // 库里 400+ 条也永远只能看到 20 条。筛选条件变化时 queryKey 变化 → 分页自动重置。
  const query = useInfiniteQuery({
    queryKey: QK.courseReviews({ q, tags }),
    queryFn: async ({ pageParam }) => {
      const data = await listCourseReviews({ q, tags, page: pageParam, pageSize: PAGE_SIZE });
      return { list: data?.list || [], hasMore: !!data?.hasMore, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: nextPageParamFrom,
    placeholderData: (prev) => prev,
    staleTime: 15 * 1000,
  });

  const list = useMemo(() => flattenPages(query.data?.pages), [query.data]);

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

        {query.hasNextPage ? (
          <button
            type="button"
            className="handbook-loadmore"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
          </button>
        ) : null}

        {!query.isFetching && list.length === 0 ? (
          <div className="handbook-mini-empty">{isZh ? '暂无课程测评' : 'No reviews yet'}</div>
        ) : null}
      </div>
    </div>
  );
}

export default CourseReviewPage;

