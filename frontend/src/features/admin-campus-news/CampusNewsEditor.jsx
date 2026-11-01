import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { campusNewsApi as api } from './api';
import { CATEGORIES, MAX_TITLE, toForm, payloadFor, validateForm, canAct, errorMessage } from './model.js';
import { Heading, Notice, Status, BackLink } from './components';
import CampusNewsImages from './CampusNewsImages';
import { Toast } from '../../context/toast';

function EditorForm({ initial, colleges }) {
  const [base, setBase] = useState(initial);
  const [form, setForm] = useState(() => toForm(initial));
  const [errors, setErrors] = useState([]);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const publicationIntent = useRef(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(base));
  const disabled = busy || uploading || conflict || (base && !canAct(base, 'edit'));
  const patch = update => setForm(previous => ({ ...previous, ...update }));
  useEffect(() => {
    const warn = event => { if (dirty || uploading || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading, busy]);
  function fail(error) { setFailure(error); if ([401, 403, 409].includes(error.status)) setConflict(true); }
  async function refresh() {
    if (!base || !window.confirm('重新读取服务器版本会丢弃本页未保存的修改，是否继续？')) return;
    try { const latest = await api.detail(base.id); setBase(latest); setForm(toForm(latest)); setConflict(false); setFailure(null); setErrors([]); }
    catch (err) { fail(err); }
  }
  async function submit(action) {
    if (lock.current || disabled) return;
    const publish = action === 'publish' || base?.lifecycleStatus === 'published';
    const issues = action === 'withdraw' ? [] : validateForm(form, publish);
    if (form.audienceScope === 'colleges' && (publish || form.collegeIds.length) && !colleges.data?.items) issues.push('学院目录尚未加载，无法核对受众。请重试目录请求。');
    if (colleges.data && form.collegeIds.some(id => !colleges.data.items.some(c => c.id === id))) issues.push('存在已失效的学院 ID，请重新选择受众。');
    if (base && action === 'publish' && dirty) issues.push('请先保存当前修改，再发布。');
    setErrors(issues); if (issues.length) return;
    if (action === 'withdraw' && !window.confirm('确认撤回？学生将无法读取此快讯。')) return;
    if (action === 'save' && base?.lifecycleStatus === 'published' && !window.confirm('保存后修改将立即公开生效，确认保存？')) return;
    lock.current = true; setBusy(true); setFailure(null);
    try {
      const payload = payloadFor(form, base?.revision);
      const signature = JSON.stringify(payload);
      if (!publicationIntent.current || publicationIntent.current.signature !== signature) publicationIntent.current = { signature, key: crypto.randomUUID() };
      const result = action === 'withdraw' ? await api.withdraw(base.id, base.revision)
        : action === 'publish' ? (base ? await api.publish(base.id, base.revision) : await api.createPublished(payload, publicationIntent.current.key))
          : base ? await api.update(base.id, payload, base.lifecycleStatus) : await api.createDraft(payload);
      setBase(result); setForm(toForm(result));
      client.setQueryData(['admin-campus-news-detail', String(result.id)], result);
      await client.invalidateQueries({ queryKey: ['admin-campus-news'] });
      Toast.success(action === 'withdraw' ? '快讯已撤回' : action === 'publish' ? '快讯已发布' : '快讯已保存');
      if (!initial) navigate(`/myzone/admin/campus-news/${result.id}/edit`, { replace: true });
    } catch (err) { fail(err); Toast.error(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <Heading title={base ? '编辑快讯' : '新建快讯'}>{base && <Status news={base} />}</Heading>
    <div className="cn-actions"><button disabled={busy || uploading} onClick={() => { if (!dirty || window.confirm('当前修改尚未保存，确认返回列表？')) navigate('/myzone/admin/campus-news'); }}>← 返回列表</button>{base && <Link to={`/myzone/admin/campus-news/${base.id}/versions`}>历史版本</Link>}</div>
    <p className="cn-muted">草稿可不完整；发布必须填写标题、分类、正文与受众。已发布内容保存后立即生效。</p>
    {failure && <Notice error={failure} retry={conflict && base ? refresh : undefined} />}
    {errors.length > 0 && <div className="cn-notice" role="alert"><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    {base && !canAct(base, 'edit') && <Notice>此记录为历史内容或已软删除，本模块仅提供只读查看，不提供恢复。</Notice>}
    <form className="cn-editor" onSubmit={e => { e.preventDefault(); submit('save'); }}>
      <fieldset className="cn-card cn-fields" disabled={Boolean(disabled)}>
        <label>标题<input value={form.title} maxLength={MAX_TITLE} onChange={e => patch({ title: e.target.value })} placeholder="为校园快讯写一个清楚的标题" /><span className="cn-muted">{form.title.length}/{MAX_TITLE} · 发布时必填</span></label>
        <label>分类<select value={form.category} onChange={e => patch({ category: e.target.value })}><option value="">请选择分类</option>{CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label>正文<textarea value={form.content} rows={14} maxLength={50000} onChange={e => patch({ content: e.target.value })} placeholder="输入正文，支持换行与段落" /><span className="cn-muted">{form.content.length}/50000 · 纯文本，保留段落，不解析 HTML</span></label>
        <div><h2>图片</h2><CampusNewsImages images={form.images} onChange={images => patch({ images })} disabled={Boolean(disabled)} onUploading={setUploading} onFatal={fail} /></div>
      </fieldset>
      <aside className="cn-editor-side">
        <fieldset className="cn-card cn-fields" disabled={Boolean(disabled)}><legend>通知受众</legend>
          <label className="cn-choice"><input type="radio" name="audience" checked={form.audienceScope === 'all'} onChange={() => patch({ audienceScope: 'all', collegeIds: [] })} />全体学生</label>
          <label className="cn-choice"><input type="radio" name="audience" checked={form.audienceScope === 'colleges'} onChange={() => patch({ audienceScope: 'colleges', collegeIds: [] })} />指定学院（多选）</label>
          {form.audienceScope === 'colleges' && <div className="cn-colleges">{colleges.isPending ? <p role="status">正在读取统一学院目录…</p> : colleges.isError ? <Notice error={colleges.error} retry={colleges.refetch} /> : !colleges.data.items.length ? <p>学院目录为空，暂不能选择学院。</p> : colleges.data.items.map(college => <label className="cn-choice" key={college.id}><input type="checkbox" checked={form.collegeIds.includes(college.id)} onChange={e => patch({ collegeIds: e.target.checked ? [...form.collegeIds, college.id] : form.collegeIds.filter(id => id !== college.id) })} />{college.name}</label>)}
            {form.collegeIds.filter(id => !colleges.data?.items.some(c => c.id === id)).map(id => <p key={id} className="cn-error">待核对学院 ID：{id}<button type="button" onClick={() => patch({ collegeIds: form.collegeIds.filter(c => c !== id) })}>移除</button></p>)}
          </div>}
          <p className="cn-muted">学院仅用于“与我相关”筛选，所有已发布快讯均可供学生阅读。</p>
        </fieldset>
        <section className="cn-card cn-fields"><h2>保存与发布</h2><p className="cn-muted">{base ? `当前版本 r${base.revision}` : '尚未保存到服务器'}{dirty ? ' · 有未保存修改' : ''}</p>
          <button className="cn-primary" type="submit" disabled={Boolean(disabled)}>{busy ? '正在处理…' : !base || base.lifecycleStatus === 'draft' ? '保存草稿' : '保存修改'}</button>
          {(!base || canAct(base, 'publish')) && <button type="button" disabled={Boolean(disabled || (base && dirty))} onClick={() => submit('publish')}>{base?.lifecycleStatus === 'withdrawn' ? '重新发布' : '发布'}</button>}
          {base && canAct(base, 'withdraw') && <button type="button" disabled={Boolean(disabled || dirty)} onClick={() => submit('withdraw')}>撤回发布</button>}
          {base && dirty && <p className="cn-muted">请先保存修改，再发布或撤回。</p>}
        <p className="cn-muted">保存与发布以服务器成功响应为准；失败不会显示成功。</p>
        </section>
      </aside>
    </form>
  </>;
}

export default function CampusNewsEditor() {
  const { id } = useParams();
  const detail = useQuery({ queryKey: ['admin-campus-news-detail', id], queryFn: () => api.detail(id), enabled: Boolean(id), retry: false, refetchOnWindowFocus: false, staleTime: 0 });
  const colleges = useQuery({ queryKey: ['admin-campus-news-colleges'], queryFn: api.colleges, retry: false });
  if (id && detail.isPending) return <p role="status">正在读取快讯…</p>;
  if (id && detail.isError) return <><BackLink /><Notice error={detail.error} retry={detail.refetch} /></>;
  return <EditorForm key={id || 'new'} initial={id ? detail.data : null} colleges={colleges} />;
}
