import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { listClubs } from '../../api/clubs';
import './Clubs.css';

const CATEGORIES = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'music', zh: '音乐', en: 'Music' },
  { key: 'sports', zh: '运动', en: 'Sports' },
  { key: 'tech', zh: '科技', en: 'Tech' },
  { key: 'arts', zh: '艺术', en: 'Arts' },
  { key: 'volunteer', zh: '志愿', en: 'Volunteer' },
];

function guessClubCategory(name, description) {
  const s = `${name || ''} ${description || ''}`.toLowerCase();
  if (s.includes('吉他') || s.includes('music') || s.includes('band') || s.includes('合唱') || s.includes('钢琴')) return 'music';
  if (s.includes('羽毛球') || s.includes('badminton') || s.includes('篮球') || s.includes('football') || s.includes('sports')) return 'sports';
  if (s.includes('摄影') || s.includes('photo') || s.includes('robot') || s.includes('tech') || s.includes('编程') || s.includes('ai')) return 'tech';
  if (s.includes('绘画') || s.includes('art') || s.includes('舞') || s.includes('dance') || s.includes('戏剧')) return 'arts';
  if (s.includes('志愿') || s.includes('volunteer') || s.includes('公益')) return 'volunteer';
  return 'all';
}

function ClubListPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const queryObj = useMemo(() => ({ q: q.trim(), page: 1, pageSize: 50 }), [q]);
  const qy = useQuery({
    queryKey: ['clubs', 'list', queryObj],
    queryFn: async () => await listClubs(queryObj),
  });

  const list = useMemo(() => {
    const raw = qy.data?.list || [];
    if (cat === 'all') return raw;
    return raw.filter((c) => guessClubCategory(c.name, c.description) === cat);
  }, [qy.data, cat]);

  return (
    <div className="club-page club-battle-page">
      <div className="club-battle-shell">
        <aside className="club-battle-sidebar" aria-label={isZh ? '分类' : 'Categories'}>
          {CATEGORIES.map((x) => {
            const active = cat === x.key;
            return (
              <button
                key={x.key}
                type="button"
                className={`club-battle-cat ${active ? 'is-active' : ''}`}
                onClick={() => setCat(x.key)}
              >
                {isZh ? x.zh : x.en}
              </button>
            );
          })}
        </aside>

        <section className="club-battle-grid-area">
          <div className="club-battle-grid-top">
            <div className="club-battle-grid-title">{isZh ? '百团大战' : 'ClubList'}</div>
            <div className="club-battle-search">
              <Search size={18} aria-hidden />
              <input
                className="club-battle-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isZh ? '搜索社团…' : 'Search clubs…'}
              />
            </div>
          </div>

          {qy.isLoading ? <div className="state-loading">加载中</div> : null}
          {qy.isError ? <div className="state-error">{qy.error?.message || (isZh ? '加载失败' : 'Failed')}</div> : null}
          {!qy.isLoading && !qy.isError && list.length === 0 ? (
            <div className="state-empty">{isZh ? '暂无社团' : 'No clubs'}</div>
          ) : null}

          <div className="club-battle-grid">
            {list.map((c) => (
              <Link key={c.id} to={`/about/club/${c.id}`} className="club-battle-item pressable">
                <div className="club-battle-logo">
                  {c.avatar ? <img src={c.avatar} alt="" /> : <div className="club-battle-logo-ph" aria-hidden />}
                </div>
                <div className="club-battle-name" title={c.name}>{c.name}</div>
                <div className="club-battle-stat">{`🔥 ${Number(c.followers || 0)} Active`}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ClubListPage;

