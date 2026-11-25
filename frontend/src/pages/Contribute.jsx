import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, HandHeart, HeartHandshake, MessageSquarePlus, ShoppingBag, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { getContributeLeaderboard, getMyContribution } from '@shared/api/contribute';
import { QK } from '@shared/query/queryKeys';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './Contribute.css';

/** 能为 Dorm 做贡献的现成入口（都是站内已有功能，这里只是汇总） */
const ENTRIES = [
  { key: 'guide', to: '/about/freshman-guide/new', Icon: BookOpen, zh: '写一篇新生指南', en: 'Write a freshman guide', descZh: '选课、办卡、宿舍、签证，你踩过的坑就是学弟学妹的路标。', descEn: 'Courses, cards, dorms, visas: your lessons are someone else’s map.' },
  { key: 'canteen', to: '/eat', Icon: UtensilsCrossed, zh: '点评食堂', en: 'Review canteen food', descZh: '吃过的菜打个分、拍张图，帮大家少踩雷。', descEn: 'Rate a dish and add a photo so others can choose better.' },
  { key: 'post', to: '/publish', Icon: MessageSquarePlus, zh: '发帖、回答问题', en: 'Post and answer', descZh: '在树洞提问或回答，热心回复也算贡献。', descEn: 'Ask or answer in TreeHole. Helpful replies count too.' },
  { key: 'trending', to: '/about/trending', Icon: TrendingUp, zh: '参与热门话题', en: 'Join trending topics', descZh: '在话题下分享观点，被点赞、评论多的帖子有额外奖励。', descEn: 'Share your take. Popular posts earn extra points.' },
  { key: 'second-hand', to: '/about/second-hand/new', Icon: ShoppingBag, zh: '闲置转给需要的人', en: 'Pass on what you don’t need', descZh: '毕业季、换宿舍，把用不上的东西挂到二手。', descEn: 'Moving out? List items in Second Hand.' },
  { key: 'errands', to: '/about/errands/new', Icon: HandHeart, zh: '跑腿互助', en: 'Help with errands', descZh: '顺路帮个忙，或者发一个求助。', descEn: 'Lend a hand on your way, or ask for help.' },
  { key: 'join', to: '/about/join-us', Icon: HeartHandshake, zh: '反馈问题 / 加入开发', en: 'Report issues / build Dorm', descZh: '发现 bug、有新想法，或者想一起写代码，都欢迎来找我们。', descEn: 'Found a bug, have an idea, or want to code with us? Reach out.' },
];

/** 和后端 CONTRIBUTION_ACTIONS 一一对应 */
const ACTION_LABELS = {
  post: ['发帖', 'Posts'],
  comment: ['评论', 'Comments'],
  cafeteria_review: ['食堂点评', 'Canteen reviews'],
  quality_bonus: ['优质内容奖励', 'Quality bonus'],
  post_popular_like: ['帖子获赞奖励', 'Popular post (likes)'],
  post_popular_comment: ['帖子热评奖励', 'Popular post (comments)'],
};

function RankMark({ rank }) {
  return <span className={`contrib-rank ${rank <= 3 ? `is-top is-top-${rank}` : ''}`}>{rank}</span>;
}

function MyContribution({ isZh, token }) {
  const q = useQuery({ queryKey: QK.contributeMe(token || ''), queryFn: getMyContribution, staleTime: 60 * 1000 });
  if (q.isPending) return <p className="contrib-muted">{isZh ? '加载中…' : 'Loading…'}</p>;
  if (q.isError) return <p className="contrib-muted" role="alert">{getApiErrorMessage(q.error)}</p>;
  const { last30d, total } = q.data || {};
  const actions = Object.entries(last30d?.byAction || {}).sort((a, b) => b[1].points - a[1].points);
  return (
    <>
      <div className="contrib-stats">
        <div className="contrib-stat">
          <span className="contrib-stat-value">{last30d?.points ?? 0}</span>
          <span className="contrib-stat-label">{isZh ? '近 30 天贡献分' : 'Points (30 days)'}</span>
        </div>
        <div className="contrib-stat">
          <span className="contrib-stat-value">{last30d?.rank ? `#${last30d.rank}` : '—'}</span>
          <span className="contrib-stat-label">{isZh ? '近 30 天排名' : 'Rank (30 days)'}</span>
        </div>
        <div className="contrib-stat">
          <span className="contrib-stat-value">{total?.points ?? 0}</span>
          <span className="contrib-stat-label">{isZh ? '累计贡献分' : 'Points (all time)'}</span>
        </div>
      </div>
      {actions.length ? (
        <ul className="contrib-breakdown">
          {actions.map(([action, v]) => (
            <li key={action}>
              <span>{(ACTION_LABELS[action] || [action, action])[isZh ? 0 : 1]}</span>
              <span className="contrib-muted">{isZh ? `${v.contributions} 次 · ${v.points} 分` : `${v.contributions} × · ${v.points} pts`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="contrib-muted">{isZh ? '近 30 天还没有贡献，从上面任选一件开始吧。' : 'No contributions in the last 30 days yet. Pick one above to start.'}</p>
      )}
    </>
  );
}

function Leaderboard({ isZh }) {
  const [range, setRange] = useState('30d');
  const q = useQuery({ queryKey: QK.contributeLeaderboard(range), queryFn: () => getContributeLeaderboard(range), staleTime: 5 * 60 * 1000 });
  const list = q.data?.list || [];
  return (
    <>
      <div className="contrib-tabs" role="tablist" aria-label={isZh ? '榜单范围' : 'Range'}>
        {[['30d', '近 30 天', 'Last 30 days'], ['all', '全部', 'All time']].map(([key, zh, en]) => (
          <button key={key} type="button" role="tab" aria-selected={range === key} className={`contrib-tab ${range === key ? 'is-on' : ''}`} onClick={() => setRange(key)}>
            {isZh ? zh : en}
          </button>
        ))}
      </div>
      {q.isPending ? <p className="contrib-muted">{isZh ? '加载中…' : 'Loading…'}</p> : null}
      {q.isError ? (
        <p className="contrib-muted" role="alert">
          {getApiErrorMessage(q.error)} <button type="button" className="contrib-linkbtn" onClick={() => q.refetch()}>{isZh ? '重试' : 'Retry'}</button>
        </p>
      ) : null}
      {q.isSuccess && list.length === 0 ? <p className="contrib-muted">{isZh ? '还没有人上榜，第一名等你来。' : 'No one here yet. Be the first!'}</p> : null}
      {list.length ? (
        <ol className="contrib-board">
          {list.map((row) => (
            <li key={row.user.id} className="contrib-board-row">
              <RankMark rank={row.rank} />
              <Link to={`/user/${row.user.id}`} className="contrib-board-user">
                <img src={row.user.avatar || '/default-avatar.svg'} alt="" className="contrib-avatar" />
                <span className="contrib-board-name">{row.user.name}</span>
                <span className="contrib-level">Lv{row.user.level}</span>
              </Link>
              <span className="contrib-board-points">
                {row.points}
                <span className="contrib-muted">{isZh ? ' 分' : ' pts'}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}

export default function Contribute() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token } = useAuth();

  return (
    <div className="contrib-page">
      <header className="contrib-hero">
        <h1 className="contrib-title">{isZh ? 'Dorm 贡献站' : 'Contribute to Dorm'}</h1>
        <p className="contrib-lead">
          {isZh
            ? 'Dorm 上的内容来自每一位同学。写一篇指南、点评一道菜、回答一个问题，都在让它变得更好。'
            : 'Everything on Dorm comes from students like you. A guide, a dish review or a helpful answer all make it better.'}
        </p>
      </header>

      <section className="contrib-section" aria-labelledby="contrib-ways">
        <h2 id="contrib-ways" className="contrib-h2">{isZh ? '从这里开始' : 'Ways to contribute'}</h2>
        <ul className="contrib-entries">
          {ENTRIES.map(({ key, to, Icon, zh, en, descZh, descEn }) => (
            <li key={key}>
              <Link to={to} className="contrib-entry">
                <span className="contrib-entry-icon" aria-hidden><Icon size={20} /></span>
                <span className="contrib-entry-text">
                  <span className="contrib-entry-title">{isZh ? zh : en}</span>
                  <span className="contrib-entry-desc">{isZh ? descZh : descEn}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="contrib-columns">
        <section className="contrib-section" aria-labelledby="contrib-mine">
          <h2 id="contrib-mine" className="contrib-h2">{isZh ? '我的贡献' : 'My contributions'}</h2>
          {isLoggedIn ? <MyContribution isZh={isZh} token={token} /> : (
            <p className="contrib-muted">
              {isZh ? '登录后可以看到自己的贡献分和排名。' : 'Log in to see your points and rank.'}{' '}
              <Link to="/login" className="contrib-link">{isZh ? '去登录' : 'Log in'}</Link>
            </p>
          )}
        </section>

        <section className="contrib-section" aria-labelledby="contrib-board">
          <h2 id="contrib-board" className="contrib-h2">{isZh ? '贡献榜' : 'Leaderboard'}</h2>
          <Leaderboard isZh={isZh} />
        </section>
      </div>

      <p className="contrib-footnote">
        {isZh
          ? '贡献分 = 发帖、评论、食堂点评、优质内容和热门帖子获得的经验，登录和点赞不算；只统计学生账号。'
          : 'Points come from posts, comments, canteen reviews, quality bonuses and popular posts. Logins and likes don’t count. Student accounts only.'}{' '}
        <Link to="/about/level-algorithm" className="contrib-link">{isZh ? '经验怎么算' : 'How EXP works'}</Link>
      </p>
    </div>
  );
}
