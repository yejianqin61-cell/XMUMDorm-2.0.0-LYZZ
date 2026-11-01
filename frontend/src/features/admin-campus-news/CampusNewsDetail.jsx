import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campusNewsApi as api } from './api';
import { Heading, Notice, Status, BackLink, ContentSnapshot } from './components';
import { canAct } from './model.js';
export default function CampusNewsDetail() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['admin-campus-news-detail', id], queryFn: () => api.detail(id), retry: false });
  const colleges = useQuery({ queryKey: ['admin-campus-news-colleges'], queryFn: api.colleges, retry: false });
  return <><Heading title="快讯详情"><BackLink /></Heading>{query.isPending ? <p role="status">正在加载详情…</p> : query.isError ? <Notice error={query.error} retry={query.refetch} /> : <>
    <div className="cn-card"><Status news={query.data} /><div className="cn-meta">创建人：{query.data.createdBy.name} · 最后修改：{query.data.updatedAt} · 发布时间：{query.data.publishedAt || '尚未发布'} · r{query.data.revision}</div><ContentSnapshot content={query.data} colleges={colleges.data?.items} /></div>
    <div className="cn-actions">{canAct(query.data, 'edit') && <Link to="edit">编辑快讯</Link>}<Link to="versions">查看历史版本</Link></div>
  </>}</>;
}
