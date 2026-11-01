import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContextState';
import { CampusNewsActions, CampusNewsIdentity } from './CampusNewsCard';
import CampusNewsMedia from './CampusNewsMedia';
import CampusComments from './CampusComments';
import { findCampusNewsPreview } from './campusNewsDemo';
import { campusNewsComments } from './campusNewsComments';
import { useCampusNewsInteraction } from './campusNewsSession';
import { useAuth } from '../../context/AuthContextState';
import { campusNewsApi as api, presentNews } from './campusNewsApi';
import { NewsFailure } from './CampusNewsRemote';
import './CampusNews.css';

function Comment({ comment, reply = false }) {
  return <article className={`campus-news-comment${reply ? ' campus-news-comment--reply' : ''}`}>
    <img src="/default-avatar.svg" alt="" width="32" height="32" />
    <div><header><strong>{comment.name}</strong><span>{comment.createdAt}</span></header><p>{comment.content}</p>
      {comment.replies?.map((item) => <Comment key={item.id} comment={item} reply />)}
    </div>
  </article>;
}

function DetailContent({ post }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const en = lang === 'en';
  const interaction = useCampusNewsInteraction(post);
  const root = useRef(null);
  useEffect(() => {
    let parent = root.current?.parentElement;
    while (parent) { parent.scrollTop = 0; parent = parent.parentElement; }
    window.scrollTo(0, 0);
  }, [post.id]);
  return <article ref={root} className="campus-news campus-news-detail campus-news-detail-page" aria-labelledby="campus-news-detail-title">
    <header className="campus-news-detail__toolbar">
      <button type="button" onClick={() => location.state?.fromCampusNews ? navigate(-1) : navigate('/about')} aria-label={en ? 'Back to feed' : '返回信息流'}><ArrowLeft size={21} /></button>
      <span>{en ? 'Campus news' : '校园快讯'}</span>
    </header>
    <div className="campus-news-detail__body">
      <CampusNewsIdentity category={post.category} audience={post.audience} createdAt={post.createdAt} />
      <h1 id="campus-news-detail-title">{post.title}</h1>
      <p className="campus-news-detail__content">{post.content}</p>
      <CampusNewsMedia images={post.images} />
      <CampusNewsActions post={post} {...interaction} onComment={() => document.getElementById('campus-news-comments')?.scrollIntoView({ block: 'start' })} />
      {post.real ? <CampusComments postId={post.id} /> : <section id="campus-news-comments" className="campus-news-comments" aria-labelledby="campus-news-comments-title">
        <h2 id="campus-news-comments-title">{en ? 'Comments' : '评论'}</h2>
        <p>{post.real ? '评论与回复尚未开放；不会显示模拟评论或提交成功。' : en ? 'Fictional comments. Posting and replies are not connected.' : '以下为模拟评论，发布与回复暂未接入。'}</p>
        {!post.real && campusNewsComments.map((comment) => <Comment key={comment.id} comment={comment} />)}
        <label className="campus-news-compose-label" htmlFor="campus-news-compose">{en ? 'Write a comment' : '发表评论'}</label>
        <textarea id="campus-news-compose" disabled rows="3" placeholder={en ? 'Comment input will be available later' : '评论输入将在后续开放'} />
        <button className="campus-news-compose-submit" type="button" disabled>{en ? 'Post (not connected)' : '发布（暂未接入）'}</button>
      </section>}
      {!post.real && <p className="campus-news-detail__notice">{en ? 'Demo data · interactions reset on refresh' : '模拟数据 · 互动仅在当前页面会话临时生效，刷新后还原'}</p>}
    </div>
  </article>;
}

function PreviewDetail() {
  const { previewId } = useParams();
  const post = findCampusNewsPreview(previewId);
  return post ? <DetailContent key={post.id} post={post} /> : <section className="campus-news campus-news-empty"><h1>未找到这条模拟快讯</h1><p>该地址只查询本地模拟数据，不会请求真实帖子接口。</p><Link to="/about">返回校园快讯</Link></section>;
}

export default function CampusNewsDetail({ realId }) {
  const { user, isLoggedIn } = useAuth();
  const context = useQuery({ queryKey: ['campus-news-context',user?.id], queryFn: api.context, enabled: Boolean(realId && isLoggedIn), retry: false, staleTime: 0 });
  const detail = useQuery({ queryKey: ['campus-news-detail-live',user?.id,realId], queryFn: async () => presentNews(await api.detail(realId), context.data.items), enabled: Boolean(realId && isLoggedIn && context.isSuccess), retry: false, staleTime: 0 });
  if (!realId) return import.meta.env.DEV ? <PreviewDetail /> : <NewsFailure error={{status:404}} />;
  if (!isLoggedIn) return <NewsFailure error={{status:401}} />;
  if (context.isError || detail.isError) return <section className="campus-news"><Link to="/about">返回校园快讯</Link><NewsFailure error={context.error || detail.error} retry={context.isError ? context.refetch : detail.refetch} /></section>;
  return detail.isSuccess ? <DetailContent key={detail.data.id} post={detail.data} /> : <p role="status">正在加载快讯详情…</p>;
}
