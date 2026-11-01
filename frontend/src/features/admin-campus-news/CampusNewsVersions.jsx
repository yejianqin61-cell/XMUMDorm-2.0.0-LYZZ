import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campusNewsApi as api } from './api';
import { Heading, Notice, BackLink, ContentSnapshot } from './components';
export default function CampusNewsVersions() {
  const { id } = useParams();
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [comparison, setComparison] = useState(null);
  const [selected, setSelected] = useState('');
  const versions = useQuery({ queryKey: ['admin-campus-news-versions', id], queryFn: () => api.versions(id), retry: false });
  const colleges = useQuery({ queryKey: ['admin-campus-news-colleges'], queryFn: api.colleges, retry: false });
  const diff = useQuery({ queryKey: ['admin-campus-news-comparison', id, comparison], queryFn: () => api.compare(id, comparison.from, comparison.to), enabled: Boolean(comparison), retry: false });
  const current = versions.data?.items.find(v => String(v.revision) === selected);
  return <><Heading title="历史版本"><BackLink /></Heading><p className="cn-muted">版本快照只读。此页仅显示服务器返回的历史，不创建演示版本。</p>
    {versions.isPending ? <p role="status">正在读取版本历史…</p> : versions.isError ? <Notice error={versions.error} retry={versions.refetch} /> : !versions.data.items.length ? <Notice>服务器未返回版本历史。</Notice> : <>
      <div className="cn-version-layout"><ol className="cn-version-list">{versions.data.items.map(v => <li key={v.revision}><button className={selected === String(v.revision) ? 'cn-selected' : ''} onClick={() => setSelected(String(v.revision))}><strong>r{v.revision} · {v.action}</strong><span>{v.actor.name} · {v.createdAt}</span><span>{v.title || '未命名草稿'}</span></button></li>)}</ol>
        <section className="cn-card">{current ? <ContentSnapshot content={current} colleges={colleges.data?.items} /> : <p>选择左侧版本查看完整快照和图片顺序。</p>}</section></div>
      <section className="cn-card"><h2>比较两个版本</h2><form className="cn-filters" onSubmit={e => { e.preventDefault(); if (from !== '' && to !== '' && from !== to) setComparison({ from, to }); }}>
        <label>原版本<select value={from} onChange={e => { setFrom(e.target.value); setComparison(null); }}><option value="">请选择</option>{versions.data.items.map(v => <option key={v.revision} value={v.revision}>r{v.revision}</option>)}</select></label>
        <label>目标版本<select value={to} onChange={e => { setTo(e.target.value); setComparison(null); }}><option value="">请选择</option>{versions.data.items.map(v => <option key={v.revision} value={v.revision}>r{v.revision}</option>)}</select></label>
        <button disabled={from === '' || to === '' || from === to || diff.isFetching}>比较差异</button>
      </form>{comparison && (diff.isPending ? <p role="status">正在比较…</p> : diff.isError ? <Notice error={diff.error} retry={diff.refetch} /> : !diff.data.changes.length ? <p>这两个版本的内容相同。</p> : diff.data.changes.map((change, i) => <div key={`${change.field}-${i}`} className="cn-diff"><h3>{change.field}</h3><div><pre aria-label="原内容">{change.before}</pre><pre aria-label="新内容">{change.after}</pre></div></div>))}</section>
    </>}
  </>;
}
