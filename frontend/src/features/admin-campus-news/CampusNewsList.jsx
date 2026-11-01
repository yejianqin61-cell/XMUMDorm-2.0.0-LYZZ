import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campusNewsApi as api } from './api';
import { CATEGORIES, STATUSES, canAct, errorMessage, toForm, validateForm } from './model.js';
import { Heading, Notice, Status, Audience } from './components';
import { Toast } from '../../context/toast';

export default function CampusNewsList() {
  const [filters, setFilters] = useState({ search: '', category: '', status: '', collegeId: '', page: 1 });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  const list = useQuery({ queryKey: ['admin-campus-news', filters], queryFn: () => api.list(filters), retry: false });
  const colleges = useQuery({ queryKey: ['admin-campus-news-colleges'], queryFn: api.colleges, retry: false });
  const change = patch => setFilters(previous => ({ ...previous, ...patch, page: 1 }));
  async function act(news, action) {
    if (lock.current || blocked || !canAct(news, action)) return;
    if (action === 'publish') {
      const issues = validateForm(toForm(news), true);
      if (issues.length) { setError(new Error(`请先编辑并补齐内容：${issues.join(' ')}`)); return; }
    }
    if (!window.confirm(action === 'withdraw' ? '撤回后，学生将无法读取此快讯。确认撤回？' : '确认发布此快讯？发布前服务器仍须校验完整内容。')) return;
    lock.current = true; setBusy(true); setError(null);
    try { await api[action](news.id, news.revision); Toast.success(action === 'withdraw' ? '快讯已撤回' : '快讯已发布'); await list.refetch(); }
    catch (err) { setError(err); if ([401, 403, 409].includes(err.status)) setBlocked(true); Toast.error(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <Heading title="全部快讯"><Link className="cn-primary" to="new">＋ 新建快讯</Link></Heading>
    <p className="cn-muted">所有管理员共同管理草稿和快讯。隐藏与软删除独立于发布状态。</p>
    <form className="cn-filters cn-card" onSubmit={e => { e.preventDefault(); change({ search: search.trim() }); }}>
      <label>标题搜索<input value={search} onChange={e => setSearch(e.target.value)} placeholder="输入标题关键词" maxLength={200} /></label>
      <label>分类<select value={filters.category} onChange={e => change({ category: e.target.value })}><option value="">全部分类</option>{CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label>发布状态<select value={filters.status} onChange={e => change({ status: e.target.value })}><option value="">全部状态</option>{Object.entries(STATUSES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label>指定学院<select disabled={!colleges.isSuccess} value={filters.collegeId} onChange={e => change({ collegeId: e.target.value })}><option value="">全部受众</option>{colleges.data?.items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <button type="submit">搜索</button>
    </form>
    {colleges.isError && <Notice error={colleges.error} retry={colleges.refetch} />}
    {error && <Notice error={error} retry={async () => { const result = await list.refetch(); if (!result.isError) { setBlocked(false); setError(null); } }} />}
    {list.isPending ? <p role="status">正在加载快讯…</p> : list.isError ? <Notice error={list.error} retry={list.refetch} />
      : !list.data.items.length ? <div className="cn-card cn-empty">没有符合条件的快讯。<Link to="new">撰写第一条快讯</Link></div>
        : <div className="cn-news-list">{list.data.items.map(news => <article key={news.id} className="cn-card cn-row">
          <div><Status news={news} /><h2><Link to={String(news.id)}>{news.title || '未命名草稿'}</Link></h2>
            <p>{CATEGORIES.find(c => c.code === news.category)?.name || '未分类'} · <Audience audience={news.audience} colleges={colleges.data?.items} /></p>
            <dl className="cn-meta"><div><dt>创建人</dt><dd>{news.createdBy.name}</dd></div><div><dt>最后修改</dt><dd>{news.updatedAt}</dd></div><div><dt>发布时间</dt><dd>{news.publishedAt || '尚未发布'}</dd></div></dl>
          </div><div className="cn-actions"><Link to={String(news.id)}>查看详情</Link>{canAct(news, 'edit') && <Link to={`${news.id}/edit`}>编辑</Link>}<Link to={`${news.id}/versions`}>历史版本</Link>
            {canAct(news, 'publish') && <button disabled={busy || blocked} onClick={() => act(news, 'publish')}>发布</button>}
            {canAct(news, 'withdraw') && <button disabled={busy || blocked} onClick={() => act(news, 'withdraw')}>撤回</button>}
          </div></article>)}</div>}
    {list.data && <nav className="cn-pagination" aria-label="快讯分页"><button disabled={filters.page <= 1 || busy} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>上一页</button><span>第 {filters.page} 页 · 共 {list.data.total} 条</span><button disabled={filters.page * 20 >= list.data.total || busy} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>下一页</button></nav>}
  </>;
}
