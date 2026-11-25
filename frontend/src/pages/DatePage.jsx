import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy, HandMetal, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { Toast } from '../context/toast';
import {
  DATE_LOOKING_FOR,
  blockDateUser,
  deleteMyDateProfile,
  getMyDateProfile,
  isNeedProfileError,
  listDateCards,
  listDateMatches,
  saveMyDateProfile,
  sayHiToDateCard,
} from '@shared/api/date';
import { getApiErrorMessage } from '@shared/utils/apiError';
import './DatePage.css';

const LOOKING_LABELS = {
  friends: ['交朋友', 'Friends'],
  study: ['学习搭子', 'Study buddy'],
  activity: ['活动搭子', 'Activity buddy'],
  dating: ['恋爱', 'Dating'],
};
const lookingLabel = (key, isZh) => (LOOKING_LABELS[key] || [key, key])[isZh ? 0 : 1];

const TABS = [
  ['discover', '发现', 'Discover'],
  ['matches', '互相打招呼', 'Matches'],
  ['me', '我的名片', 'My card'],
];

function Avatar({ src }) {
  return <img className="date-avatar" src={src || '/default-avatar.svg'} alt="" />;
}

function Tags({ tags }) {
  if (!tags?.length) return null;
  return <ul className="date-tags">{tags.map((t) => <li key={t}>{t}</li>)}</ul>;
}

function NeedProfile({ isZh, onGo }) {
  return (
    <div className="date-empty">
      <p>{isZh ? '先挂出自己的名片，才能看到别人的。这样大家都是互相可见的。' : 'Publish your own card first. Everyone here is mutually visible.'}</p>
      <button type="button" className="date-btn date-btn-primary" onClick={onGo}>{isZh ? '去写名片' : 'Write my card'}</button>
    </div>
  );
}

function Discover({ isZh, onNeedProfile }) {
  const qc = useQueryClient();
  const [lookingFor, setLookingFor] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['date', 'cards', lookingFor],
    queryFn: ({ pageParam }) => listDateCards({ lookingFor, cursor: pageParam || undefined }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
    retry: (count, err) => !isNeedProfileError(err) && count < 2,
  });
  const cards = useMemo(() => (q.data?.pages || []).flatMap((p) => p?.list || []), [q.data]);
  const [gone, setGone] = useState(() => new Set());
  const hide = (id) => setGone((prev) => new Set(prev).add(id));

  const hi = useMutation({
    mutationFn: (userId) => sayHiToDateCard(userId),
    onSuccess: (data, userId) => {
      hide(userId);
      if (data?.matched) {
        Toast.success(isZh ? '你们互相打了招呼！去「互相打招呼」看联系方式' : 'It’s a match! See contact in Matches');
        qc.invalidateQueries({ queryKey: ['date', 'matches'] });
      } else {
        Toast.success(isZh ? '已打招呼。对方也向你打招呼时，你们会互相看到联系方式' : 'Said hi. If they say hi back, you’ll both see contacts');
      }
    },
    onError: (e) => Toast.error(getApiErrorMessage(e)),
  });
  const block = useMutation({
    mutationFn: (userId) => blockDateUser(userId),
    onSuccess: (_d, userId) => { hide(userId); Toast.success(isZh ? '已拉黑，你们将互相看不到' : 'Blocked'); },
    onError: (e) => Toast.error(getApiErrorMessage(e)),
  });

  if (q.isError && isNeedProfileError(q.error)) return <NeedProfile isZh={isZh} onGo={onNeedProfile} />;
  const visible = cards.filter((c) => !gone.has(c.user.id));

  return (
    <>
      <div className="date-filters" role="group" aria-label={isZh ? '想找' : 'Looking for'}>
        {[['', '全部', 'All'], ...DATE_LOOKING_FOR.map((k) => [k, ...LOOKING_LABELS[k]])].map(([key, zh, en]) => (
          <button key={key || 'all'} type="button" aria-pressed={lookingFor === key} className={`date-chip ${lookingFor === key ? 'is-on' : ''}`} onClick={() => setLookingFor(key)}>
            {isZh ? zh : en}
          </button>
        ))}
      </div>
      {q.isPending ? <p className="date-muted">{isZh ? '加载中…' : 'Loading…'}</p> : null}
      {q.isError ? <p className="date-muted" role="alert">{getApiErrorMessage(q.error)}</p> : null}
      {q.isSuccess && visible.length === 0 ? <div className="date-empty"><p>{isZh ? '暂时没有新的名片了，过几天再来看看。' : 'No new cards right now. Check back later.'}</p></div> : null}
      <ul className="date-cards">
        {visible.map((c) => (
          <li key={c.user.id} className="date-card">
            <div className="date-card-head">
              <Avatar src={c.user.avatar} />
              <div className="date-card-who">
                <span className="date-name">{c.user.name}</span>
                <span className="date-sub">Lv{c.user.level} · {lookingLabel(c.looking_for, isZh)}</span>
              </div>
            </div>
            <p className="date-intro">{c.intro}</p>
            <Tags tags={c.tags} />
            <div className="date-card-actions">
              <button type="button" className="date-btn date-btn-primary" disabled={hi.isPending} onClick={() => hi.mutate(c.user.id)}>
                <HandMetal size={16} aria-hidden /> {isZh ? '打招呼' : 'Say hi'}
              </button>
              <button type="button" className="date-btn date-btn-ghost" disabled={block.isPending} onClick={() => { if (window.confirm(isZh ? `拉黑 ${c.user.name}？你们将互相看不到。` : `Block ${c.user.name}?`)) block.mutate(c.user.id); }}>
                <Ban size={14} aria-hidden /> {isZh ? '拉黑' : 'Block'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {q.hasNextPage ? (
        <button type="button" className="date-btn date-more" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          {q.isFetchingNextPage ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '加载更多' : 'Load more')}
        </button>
      ) : null}
    </>
  );
}

function Matches({ isZh }) {
  const q = useQuery({ queryKey: ['date', 'matches'], queryFn: listDateMatches });
  const list = q.data?.list || [];
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); Toast.success(isZh ? '已复制' : 'Copied'); } catch { Toast.error(isZh ? '复制失败，请手动选中' : 'Copy failed'); }
  };
  if (q.isPending) return <p className="date-muted">{isZh ? '加载中…' : 'Loading…'}</p>;
  if (q.isError) return <p className="date-muted" role="alert">{getApiErrorMessage(q.error)}</p>;
  if (!list.length) return <div className="date-empty"><p>{isZh ? '还没有互相打招呼的人。在「发现」里遇到合拍的，就打个招呼吧。' : 'No matches yet. Say hi to someone in Discover.'}</p></div>;
  return (
    <ul className="date-cards">
      {list.map((m) => (
        <li key={m.user.id} className="date-card is-match">
          <div className="date-card-head">
            <Avatar src={m.user.avatar} />
            <div className="date-card-who">
              <Link to={`/user/${m.user.id}`} className="date-name">{m.user.name}</Link>
              <span className="date-sub">{lookingLabel(m.looking_for, isZh)}</span>
            </div>
          </div>
          <p className="date-intro">{m.intro}</p>
          <Tags tags={m.tags} />
          <div className="date-contact">
            <span className="date-muted">{isZh ? '联系方式' : 'Contact'}</span>
            <span className="date-contact-value">{m.contact}</span>
            <button type="button" className="date-btn date-btn-ghost" onClick={() => copy(m.contact)}><Copy size={14} aria-hidden /> {isZh ? '复制' : 'Copy'}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MyCard({ isZh }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['date', 'me'], queryFn: getMyDateProfile });
  if (q.isPending) return <p className="date-muted">{isZh ? '加载中…' : 'Loading…'}</p>;
  if (q.isError) return <p className="date-muted" role="alert">{getApiErrorMessage(q.error)}</p>;
  return <MyCardForm key={q.data?.updated_at || 'new'} isZh={isZh} initial={q.data} onSaved={() => { qc.invalidateQueries({ queryKey: ['date'] }); }} />;
}

function MyCardForm({ isZh, initial, onSaved }) {
  const [intro, setIntro] = useState(initial?.intro || '');
  const [contact, setContact] = useState(initial?.contact || '');
  const [lookingFor, setLookingFor] = useState(initial?.looking_for || 'friends');
  const [tagText, setTagText] = useState((initial?.tags || []).join('，'));
  const [visible, setVisible] = useState(initial ? initial.visible : true);
  const tags = tagText.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean);

  const save = useMutation({
    mutationFn: () => saveMyDateProfile({ content: intro, contact, looking_for: lookingFor, tags, visible }),
    onSuccess: () => { Toast.success(isZh ? '名片已保存' : 'Saved'); onSaved(); },
    onError: (e) => Toast.error(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: deleteMyDateProfile,
    onSuccess: () => { Toast.success(isZh ? '名片已删除' : 'Deleted'); onSaved(); },
    onError: (e) => Toast.error(getApiErrorMessage(e)),
  });

  return (
    <form className="date-form" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <label className="date-field">
        <span>{isZh ? '想找' : 'Looking for'}</span>
        <select value={lookingFor} onChange={(e) => setLookingFor(e.target.value)}>
          {DATE_LOOKING_FOR.map((k) => <option key={k} value={k}>{lookingLabel(k, isZh)}</option>)}
        </select>
      </label>
      <label className="date-field">
        <span>{isZh ? '自我介绍' : 'About me'} <em className="date-muted">{intro.length}/300</em></span>
        <textarea rows={4} maxLength={300} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={isZh ? '年级、专业、平时喜欢做什么、想找什么样的搭子……' : 'Year, major, hobbies, what kind of buddy you want…'} />
      </label>
      <label className="date-field">
        <span>{isZh ? '兴趣标签（最多 6 个，用逗号分隔）' : 'Tags (up to 6, comma separated)'}</span>
        <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder={isZh ? '羽毛球，咖啡，摄影' : 'badminton, coffee, photography'} />
        {tags.length > 6 ? <em className="date-warn">{isZh ? '标签超过 6 个' : 'More than 6 tags'}</em> : null}
      </label>
      <label className="date-field">
        <span>{isZh ? '联系方式（微信号等，只有互相打招呼的人能看到）' : 'Contact (only visible to matches)'}</span>
        <input maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={isZh ? '微信号' : 'WeChat ID'} />
      </label>
      <label className="date-check">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        <span>{isZh ? '在「发现」里展示我的名片（关掉后别人看不到你，你也看不到别人）' : 'Show my card in Discover (if off, you won’t see others either)'}</span>
      </label>
      <div className="date-form-actions">
        <button type="submit" className="date-btn date-btn-primary" disabled={save.isPending || !intro.trim() || !contact.trim() || tags.length > 6}>
          {save.isPending ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存名片' : 'Save')}
        </button>
        {initial ? (
          <button type="button" className="date-btn date-btn-ghost" disabled={remove.isPending} onClick={() => { if (window.confirm(isZh ? '删除名片？你发出的招呼也会一起删除。' : 'Delete your card? Your hellos will be removed too.')) remove.mutate(); }}>
            {isZh ? '删除名片' : 'Delete card'}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function DatePage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'discover';
  const go = (key) => setParams(key === 'discover' ? {} : { tab: key }, { replace: true });

  return (
    <div className="date-page">
      <header className="date-hero">
        <h1 className="date-title">{isZh ? '交友' : 'Meet people'}</h1>
        <p className="date-lead">{isZh ? '找学习搭子、活动搭子，或者认识新朋友。' : 'Find a study buddy, an activity buddy, or just new friends.'}</p>
        <p className="date-safety"><ShieldCheck size={16} aria-hidden />
          {isZh
            ? '只有挂出名片的同学互相可见；双方都打招呼后才显示联系方式；遇到不舒服的人可以直接拉黑。'
            : 'Only people with a card can see each other. Contacts appear only after you both say hi. Block anyone who makes you uncomfortable.'}
        </p>
      </header>

      {!isLoggedIn ? (
        <div className="date-empty">
          <p>{isZh ? '登录后才能使用交友。' : 'Log in to use this feature.'}</p>
          <Link to="/login" className="date-btn date-btn-primary">{isZh ? '去登录' : 'Log in'}</Link>
        </div>
      ) : (
        <>
          <div className="date-tabs" role="tablist">
            {TABS.map(([key, zh, en]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`date-tab ${tab === key ? 'is-on' : ''}`} onClick={() => go(key)}>
                {isZh ? zh : en}
              </button>
            ))}
          </div>
          <section className="date-panel">
            {tab === 'discover' ? <Discover isZh={isZh} onNeedProfile={() => go('me')} /> : null}
            {tab === 'matches' ? <Matches isZh={isZh} /> : null}
            {tab === 'me' ? <MyCard isZh={isZh} /> : null}
          </section>
        </>
      )}
    </div>
  );
}
