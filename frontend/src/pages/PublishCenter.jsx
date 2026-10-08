import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { listMyClubs } from '@shared/api/clubs';
import RouteTransition from '../components/ui/RouteTransition';
import './PublishCenter.css';

function PublishCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [activeEntry, setActiveEntry] = useState(() => searchParams.get('entry') === 'club' ? 'club' : 'treehole');

  const entries = [
    { key: 'treehole', title: isZh ? '发树洞' : 'TreeHole', to: '/post/new' },
    { key: 'marketplace', title: isZh ? '发二手' : 'Marketplace', to: '/about/second-hand/new' },
    { key: 'errand', title: isZh ? '发跑腿' : 'Errand', to: '/about/errands/new' },
    { key: 'club', title: isZh ? '发社团内容' : 'Club content' },
  ];

  const clubsQuery = useQuery({
    queryKey: ['clubs', 'publish-options'],
    queryFn: listMyClubs,
    enabled: isLoggedIn && activeEntry === 'club',
  });

  const openEntry = useCallback((path) => {
    if (!isLoggedIn) {
      const target = new URL(path, window.location.origin);
      navigate('/login', { state: { from: { pathname: target.pathname, search: target.search } } });
      return;
    }
    navigate(path);
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const entryPath = {
      treehole: '/post/new',
      marketplace: '/about/second-hand/new',
      errand: '/about/errands/new',
      club: null,
    }[searchParams.get('entry')];

    if (entryPath) openEntry(entryPath);
  }, [searchParams, openEntry]);

  const selectedEntry = entries.find((entry) => entry.key === activeEntry) || entries[0];

  return (
    <RouteTransition className="publish-center-page">
      <div className="publish-center-shell">
        <section className="publish-center-tabs" aria-label={isZh ? '发布类型' : 'Publish type'}>
          <div className="publish-center-tablist" role="tablist">
            {entries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={activeEntry === entry.key}
                className={`publish-center-tab${activeEntry === entry.key ? ' publish-center-tab--active' : ''}`}
                onClick={() => setActiveEntry(entry.key)}
              >
                {entry.title}
              </button>
            ))}
          </div>
          <div className="publish-center-tabpanel" role="tabpanel">
            {selectedEntry.key !== 'club' ? (
              <button type="button" className="publish-center-action" onClick={() => openEntry(selectedEntry.to)}>
                {isZh ? `去${selectedEntry.title}` : `Create ${selectedEntry.title}`}
              </button>
            ) : !isLoggedIn ? (
              <button type="button" className="publish-center-action" onClick={() => openEntry('/publish?entry=club')}>
                {isZh ? '登录后选择社团' : 'Log in to choose a club'}
              </button>
            ) : clubsQuery.isLoading ? (
              <div className="publish-center-state">{isZh ? '正在加载可管理的社团…' : 'Loading manageable clubs…'}</div>
            ) : clubsQuery.isError ? (
              <div className="publish-center-state publish-center-state--error">
                {isZh ? '社团列表加载失败，请稍后重试。' : 'Could not load clubs. Please try again.'}
              </div>
            ) : (
              <div className="publish-center-clubs">
                <p className="publish-center-hint">
                  {isZh
                    ? (isAdmin ? '选择社团与内容类型。' : '仅显示你拥有管理权限的社团。')
                    : (isAdmin ? 'Choose a club and content type.' : 'Only clubs you can manage are shown.')}
                </p>
                {(clubsQuery.data?.list || []).filter((club) => isAdmin || club.role === 'admin').map((club) => (
                  <div key={club.id} className="publish-center-club-row">
                    <div className="publish-center-club-name">{club.name}</div>
                    <div className="publish-center-club-actions">
                      <button type="button" onClick={() => openEntry(`/about/club/post/new?clubId=${club.id}`)}>
                        {isZh ? '发日常' : 'Post'}
                      </button>
                      <button type="button" onClick={() => openEntry(`/about/club/activity/new?clubId=${club.id}`)}>
                        {isZh ? '发活动' : 'Activity'}
                      </button>
                    </div>
                  </div>
                ))}
                {!clubsQuery.data?.list?.some((club) => isAdmin || club.role === 'admin') ? (
                  <div className="publish-center-state">{isZh ? '暂无可管理的社团。' : 'No manageable clubs.'}</div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </RouteTransition>
  );
}

export default PublishCenter;
