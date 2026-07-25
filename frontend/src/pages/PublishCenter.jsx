import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import RouteTransition from '../components/ui/RouteTransition';
import './PublishCenter.css';

function PublishCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [activeEntry, setActiveEntry] = useState('treehole');

  const entries = [
    { key: 'treehole', title: isZh ? '发树洞' : 'TreeHole', to: '/post/new' },
    { key: 'marketplace', title: isZh ? '发二手' : 'Marketplace', to: '/about/second-hand/new' },
    { key: 'errand', title: isZh ? '发跑腿' : 'Errand', to: '/about/errands/new' },
  ];

  const openEntry = (path) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: path } } });
      return;
    }
    navigate(path);
  };

  useEffect(() => {
    const entryPath = {
      treehole: '/post/new',
      marketplace: '/about/second-hand/new',
      errand: '/about/errands/new',
    }[searchParams.get('entry')];

    if (entryPath) openEntry(entryPath);
  }, [searchParams, isLoggedIn, navigate]);

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
            <button type="button" className="publish-center-action" onClick={() => openEntry(selectedEntry.to)}>
              {isZh ? `去${selectedEntry.title}` : `Create ${selectedEntry.title}`}
            </button>
          </div>
        </section>
      </div>
    </RouteTransition>
  );
}

export default PublishCenter;
