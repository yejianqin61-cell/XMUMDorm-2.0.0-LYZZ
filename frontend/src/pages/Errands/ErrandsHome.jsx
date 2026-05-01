import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package, ShoppingBag, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QK } from '../../query/queryKeys';
import { listErrands } from '../../api/errands';
import ErrandCard from './ErrandCard';
import './Errands.css';

const TABS = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'delivery', zh: '代取', en: 'Delivery', icon: Package },
  { key: 'purchase', zh: '代购', en: 'Purchase', icon: ShoppingBag },
  { key: 'urgent', zh: '紧急', en: 'Urgent', icon: Zap },
];

function ErrandsHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('open');

  const params = useMemo(() => ({ type: tab, status, page: 1, pageSize: 30 }), [tab, status]);
  const q = useQuery({
    queryKey: QK.errandsList(params),
    queryFn: async () => await listErrands(params),
  });

  const list = q.data?.list || [];
  const errorMsg = q.error?.message || (isZh ? '加载失败，请稍后再试' : 'Failed to load');

  return (
    <div className="err-page">
      <div className="err-topbar">
        <div className="err-title">{isZh ? '跑腿服务' : 'Errands'}</div>
        <Link className="err-pub-btn pressable" to="/about/errands/new" aria-label={isZh ? '发布任务' : 'Publish'}>
          <Plus size={18} aria-hidden />
          <span>{isZh ? '发布' : 'Publish'}</span>
        </Link>
      </div>

      <div className="err-tabs" role="tablist" aria-label="Errand tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`err-tab ${active ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
              role="tab"
              aria-selected={active}
            >
              {Icon ? <Icon size={16} aria-hidden /> : null}
              <span>{isZh ? t.zh : t.en}</span>
            </button>
          );
        })}
      </div>

      <div className="err-status-row">
        {[
          { key: 'open', zh: '进行中', en: 'Open' },
          { key: 'taken', zh: '已接单', en: 'Taken' },
        ].map((s) => {
          const active = status === s.key;
          return (
            <button
              key={s.key}
              type="button"
              className={`err-status-chip ${active ? 'is-active' : ''}`}
              onClick={() => setStatus(s.key)}
            >
              {isZh ? s.zh : s.en}
            </button>
          );
        })}
      </div>

      {q.isLoading ? <div className="state-loading">加载中</div> : null}
      {q.isError ? <div className="state-error">{errorMsg}</div> : null}
      {!q.isLoading && !q.isError && list.length === 0 ? (
        <div className="state-empty err-empty">
          <div>{isZh ? '暂无任务' : 'No errands'}</div>
          <img
            className="err-empty-gif"
            src="/gif/耄耋猫动态gif表情包 (6)_爱给网_aigei_com.gif"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}

      <div className="err-list">
        {list.map((e) => (
          <ErrandCard key={e.id} errand={e} />
        ))}
      </div>
    </div>
  );
}

export default ErrandsHome;

