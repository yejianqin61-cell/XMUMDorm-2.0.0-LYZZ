import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QK } from '../../query/queryKeys';
import { getClubFeed, listClubActivities, listClubPosts, listClubs } from '../../api/clubs';
import './Clubs.css';

const TABS = [
  { key: 'recommend', zh: '推荐', en: 'Recommend' },
  { key: 'activities', zh: '活动', en: 'Activities' },
  { key: 'clubs', zh: '社团大全', en: 'ClubsList' },
  { key: 'posts', zh: '日常', en: 'Posts' },
];

function ClubsHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('recommend');

  const q = useQuery({
    queryKey: ['clubs', 'home', tab],
    queryFn: async () => {
      if (tab === 'recommend') return await getClubFeed({ page: 1, pageSize: 12 });
      if (tab === 'activities') return await listClubActivities({ page: 1, pageSize: 20 });
      if (tab === 'clubs') return await listClubs({ page: 1, pageSize: 30 });
      return await listClubPosts({ page: 1, pageSize: 12 });
    },
  });

  const list = useMemo(() => q.data?.list || [], [q.data]);
  const errorMsg = q.error?.message || (isZh ? '加载失败，请稍后再试' : 'Failed to load');

  return (
    <div className="club-page">
      <div className="club-top">
        <div className="club-title">{isZh ? '社团广场' : 'Clubs'}</div>
      </div>

      <div className="club-tabs" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`club-tab ${active ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
              role="tab"
              aria-selected={active}
            >
              {isZh ? t.zh : t.en}
            </button>
          );
        })}
      </div>

      {q.isLoading ? <div className="state-loading">加载中</div> : null}
      {q.isError ? <div className="state-error">{errorMsg}</div> : null}
      {!q.isLoading && !q.isError && list.length === 0 ? (
        <div className="state-empty club-empty">{isZh ? '暂无内容' : 'No content'}</div>
      ) : null}

      <div className="club-list">
        {tab === 'clubs'
          ? list.map((c) => (
              <Link key={c.id} to={`/about/club/${c.id}`} className="club-card pressable">
                <div className="club-card-row">
                  {c.avatar ? <img src={c.avatar} alt="" className="club-avatar" /> : <div className="club-avatar club-avatar--ph" />}
                  <div className="club-card-main">
                    <div className="club-card-name">{c.name}</div>
                    <div className="club-card-desc">{c.description}</div>
                  </div>
                  <div className="club-followers">{Number(c.followers || 0)}</div>
                </div>
              </Link>
            ))
          : tab === 'activities'
            ? list.map((a) => (
                <Link key={a.id} to={`/about/club/activity/${a.id}`} className="club-feed pressable">
                  {a.cover ? <img src={a.cover} alt="" className="club-feed-cover" /> : null}
                  <div className="club-feed-body">
                    <div className="club-feed-title">{a.title}</div>
                    <div className="club-feed-sub">{[a.clubName, a.location].filter(Boolean).join(' · ')}</div>
                    <div className="club-feed-stats">
                      <span className="club-stat"><Eye size={16} aria-hidden />{a.stats?.views ?? 0}</span>
                      <span className="club-stat"><Heart size={16} aria-hidden />{a.stats?.likes ?? 0}</span>
                    </div>
                  </div>
                </Link>
              ))
            : tab === 'posts'
              ? list.map((p) => (
                  <Link key={p.id} to={`/about/club/post/${p.id}`} className="club-feed pressable">
                    {p.images && p.images[0] ? <img src={p.images[0]} alt="" className="club-feed-cover" /> : null}
                    <div className="club-feed-body">
                      <div className="club-feed-title">{p.title || (isZh ? '社团日常' : 'Club post')}</div>
                      <div className="club-feed-sub">{p.clubName}</div>
                      <div className="club-feed-stats">
                        <span className="club-stat"><Eye size={16} aria-hidden />{p.stats?.views ?? 0}</span>
                        <span className="club-stat"><Heart size={16} aria-hidden />{p.stats?.likes ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                ))
              : list.map((x) => (
                  <Link
                    key={`${x.type}-${x.id}`}
                    to={x.type === 'activity' ? `/about/club/activity/${x.id}` : `/about/club/post/${x.id}`}
                    className="club-feed pressable"
                  >
                    {x.cover ? <img src={x.cover} alt="" className="club-feed-cover" /> : null}
                    <div className="club-feed-body">
                      <div className="club-feed-type">{x.type === 'activity' ? (isZh ? '活动' : 'Activity') : (isZh ? '日常' : 'Post')}</div>
                      <div className="club-feed-title">{x.title}</div>
                      <div className="club-feed-sub">{x.clubName}</div>
                      <div className="club-feed-stats">
                        <span className="club-stat"><Eye size={16} aria-hidden />{x.stats?.views ?? 0}</span>
                        <span className="club-stat"><Heart size={16} aria-hidden />{x.stats?.likes ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
      </div>
    </div>
  );
}

export default ClubsHome;

