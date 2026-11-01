import { Link } from 'react-router-dom';
import { CATEGORIES, STATUSES, errorMessage, safeImageUrl } from './model.js';
export function Notice({ children, error, retry }) {
  return <div className="cn-notice" role={error ? 'alert' : 'status'}>{error ? errorMessage(error) : children}
    {retry && <button type="button" onClick={() => retry()}>重试</button>}</div>;
}
export function Heading({ title, children }) {
  return <header className="cn-heading"><div><p className="cn-eyebrow">校园快讯管理</p><h1>{title}</h1></div><div className="cn-actions">{children}</div></header>;
}
export function Status({ news }) {
  return <span className="cn-badges"><span className={`cn-badge cn-${news.lifecycleStatus}`}>{STATUSES[news.lifecycleStatus]}</span>
    {news.hiddenByAdmin && <span className="cn-badge">管理员隐藏</span>}{news.deletedAt && <span className="cn-badge">已软删除</span>}</span>;
}
export function Audience({ audience, colleges = [] }) {
  if (audience.scope === 'unclassified') return '历史受众尚未补录';
  return audience.scope === 'all' ? '全体学生' : audience.collegeIds.length
    ? audience.collegeIds.map(id => colleges.find(c => c.id === id)?.name || `学院 ID ${id}`).join('、') : '待选择学院';
}
export function ContentSnapshot({ content, colleges = [] }) {
  return <article className="cn-snapshot"><p className="cn-muted">{CATEGORIES.find(c => c.code === content.category)?.name || '未分类'} · <Audience audience={content.audience} colleges={colleges} /></p>
    <h2>{content.title || '未命名草稿'}</h2><p className="cn-body">{content.content || '暂无正文'}</p>
    <div className="cn-snapshot-images">{content.images.map((image, i) => <a key={image.id} href={safeImageUrl(image.url) || undefined} target="_blank" rel="noopener noreferrer"><img src={safeImageUrl(image.url) || undefined} alt={image.alt || `第 ${i + 1} 张图片`} loading="lazy" /><span>图片 {i + 1}</span></a>)}</div>
  </article>;
}
export function BackLink() { return <Link to="/myzone/admin/campus-news">← 返回快讯列表</Link>; }
