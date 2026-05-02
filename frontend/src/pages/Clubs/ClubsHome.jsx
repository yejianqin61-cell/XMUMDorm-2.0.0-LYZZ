import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getClubFeed } from '../../api/clubs';
import './Clubs.css';

const FILTERS = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'music', zh: '音乐', en: 'Music' },
  { key: 'tech', zh: '科技', en: 'Tech' },
  { key: 'culture', zh: '文化', en: 'Culture' },
  { key: 'sport', zh: '运动', en: 'Sport' },
  { key: 'art', zh: '艺术', en: 'Art' },
];

function formatDateTime(t) {
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

function activityIsDone(x) {
  return x?.type === 'activity' && String(x?.status || '') === 'ended';
}

function ClubsHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState('all');
  const [lifecycle, setLifecycle] = useState('open');

  const q = useQuery({
    queryKey: ['clubs', 'square', 'feed'],
    queryFn: async () => await getClubFeed({ page: 1, pageSize: 20 }),
  });

  const list = useMemo(() => {
    const raw = q.data?.list || [];
    const byCat = filter === 'all' ? raw : raw.filter((x) => (x.clubCategory || 'all') === filter);
    if (lifecycle === 'done') return byCat.filter((x) => activityIsDone(x));
    return byCat.filter((x) => x.type === 'post' || (x.type === 'activity' && !activityIsDone(x)));
  }, [q.data, filter, lifecycle]);
  const errorMsg = q.error?.message || (isZh ? '加载失败，请稍后再试' : 'Failed to load');

  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '社团广场' : 'Club Square'}</div>
        {isAdmin ? (
          <Link to="/about/club/new" className="club-admin-create pressable">
            {isZh ? '创建社团' : 'Create'}
          </Link>
        ) : null}
      </div>

      {/* Top feature grid */}
      <div className="club-feature-grid">
        <Link to="/about/club/list" className="club-feature club-feature--purple pressable">
          <div className="club-feature-left">
            <div className="club-feature-title">{isZh ? '社团大全' : 'Club List'}</div>
            <div className="club-feature-sub">{isZh ? '发现你感兴趣的社团' : 'Discover clubs'}</div>
          </div>
          <div className="club-feature-art club-feature-art--mega" aria-hidden />
        </Link>
        <Link to="/about/club/my" className="club-feature club-feature--blue pressable">
          <div className="club-feature-left">
            <div className="club-feature-title">{isZh ? '我的社团' : 'My Clubs'}</div>
            <div className="club-feature-sub">{isZh ? '关注、活动与日常' : 'Follows & updates'}</div>
          </div>
          <div className="club-feature-art club-feature-art--badge" aria-hidden />
        </Link>
      </div>

      {/* Middle: category tabs + Open/Done */}
      <div className="club-filter-bar">
        <div className="club-filter" role="tablist" aria-label="club category filter">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                className={`club-filter-tab ${active ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
                role="tab"
                aria-selected={active}
              >
                {isZh ? f.zh : f.en}
              </button>
            );
          })}
        </div>
        <div className="club-lifecycle" role="group" aria-label={isZh ? '活动状态筛选' : 'Activity state'}>
          {(['open', 'done']).map((key) => {
            const active = lifecycle === key;
            const label = key === 'open' ? (isZh ? '进行中' : 'Open') : (isZh ? '已结束' : 'Done');
            return (
              <button
                key={key}
                type="button"
                className={`club-lifecycle-pill ${active ? 'is-active' : ''}`}
                onClick={() => setLifecycle(key)}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {q.isLoading ? <div className="state-loading">加载中</div> : null}
      {q.isError ? <div className="state-error">{errorMsg}</div> : null}
      {!q.isLoading && !q.isError && list.length === 0 ? (
        <div className="state-empty club-empty">{isZh ? '暂无内容' : 'No content'}</div>
      ) : null}

      {/* Bottom post feed (horizontal list cards) */}
      <div className="club-feed-list">
        {list.map((x) => {
          const href = x.type === 'activity' ? `/about/club/activity/${x.id}` : `/about/club/post/${x.id}`;
          const tagText = x.type === 'activity' ? (isZh ? '活动' : 'ACTIVITY') : (isZh ? '日常' : 'POST');
          const when = formatDateTime(x.createdAt);
          const cover = x.cover;
          return (
            <Link key={`${x.type}-${x.id}`} to={href} className="club-hcard pressable">
              <div className="club-hcard-img">
                {cover ? <img src={cover} alt="" /> : <div className="club-hcard-img-ph" aria-hidden />}
              </div>
              <div className="club-hcard-body">
                <div className="club-hcard-title-row">
                  <span className={`club-hcard-tag ${x.type === 'activity' ? 'is-activity' : 'is-post'}`}>{tagText}</span>
                  <div className="club-hcard-title">{x.title}</div>
                </div>
                <div className="club-hcard-meta">{[when, x.clubName].filter(Boolean).join(' · ')}</div>
                {x.summary ? <div className="club-hcard-desc">{x.summary}</div> : null}
                <div className="club-hcard-stats">
                  <span className="club-hcard-stat"><Eye size={16} aria-hidden />{x.stats?.views ?? 0}</span>
                  <span className="club-hcard-stat"><Heart size={16} aria-hidden />{x.stats?.likes ?? 0}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default ClubsHome;

