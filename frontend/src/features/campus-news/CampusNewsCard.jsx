import { Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContextState';
import { CAMPUS_NEWS_CATEGORIES, CAMPUS_NEWS_COLLEGES } from './campusNewsModel';
import CampusNewsMedia from './CampusNewsMedia';
import { useCampusLike } from './useCampusLike';
import CampusFavoriteButton from './CampusFavoriteButton';
import CampusShareButton from './CampusShareButton';

export function CampusNewsIdentity({ category, audience, createdAt }) {
  const { lang } = useLanguage();
  const config = CAMPUS_NEWS_CATEGORIES[category];
  const date = new Date(createdAt);
  const valid = !Number.isNaN(date.getTime());
  const timestamp = valid ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(date) : '—';
  return (
    <header className={`campus-news-identity campus-news-identity--${config.tone}`}>
      <img className="campus-news-identity__avatar" src={config.avatar} alt="" width="44" height="44" />
      <div className="campus-news-identity__name">
        <strong>{lang === 'en' ? config.nameEn : config.name}</strong>
        <div className="campus-news-audience" aria-label={lang === 'en' ? 'Audience' : '通知受众'}>
          {audience.scope === 'all' ? <span>{lang === 'en' ? 'All students' : '全体学生'}</span>
            : audience.colleges ? audience.colleges.map(college => <span key={college.id}>{college.name}</span>) : audience.collegeCodes.map((code) => <span key={code}>{lang === 'en' ? CAMPUS_NEWS_COLLEGES[code].nameEn : CAMPUS_NEWS_COLLEGES[code].name}</span>)}
        </div>
      </div>
      <time dateTime={valid ? createdAt : undefined} title={valid ? date.toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN', { timeZone: 'Asia/Shanghai' }) : ''}>
        {timestamp}
      </time>
    </header>
  );
}

export function CampusNewsActions({ post, liked, favorited, onLike, onFavorite, onComment }) {
  const { lang } = useLanguage();
  const en = lang === 'en';
  const realLike = useCampusLike(post);
  if (post.real) return <><div className="campus-news-actions" aria-label="校园互动">
    <button type="button" disabled={!realLike.canLike} aria-busy={realLike.pending} aria-pressed={realLike.liked === true} aria-label="点赞" className={realLike.liked ? 'is-liked' : ''} onClick={realLike.onLike} title="登录后可点赞；提交期间请稍候"><Heart size={19} fill={realLike.liked ? 'currentColor' : 'none'} /><span>{realLike.likeCount ?? '—'}</span></button>
    <button type="button" onClick={onComment} title="查看评论"><MessageCircle size={19} /><span>{realLike.commentCount ?? '—'}</span></button>
    <CampusFavoriteButton postId={post.id} />
    <CampusShareButton postId={post.id} />
  </div>{realLike.error && <p role="alert">{realLike.error}<button type="button" onClick={() => realLike.retry()}>重试</button></p>}</>;
  return (
    <div className="campus-news-actions" aria-label={en ? 'Demo interactions' : '演示互动'}>
      <button type="button" className={liked ? 'is-liked' : ''} aria-pressed={liked} aria-label={en ? 'Like (temporary demo)' : '点赞（临时演示）'} onClick={onLike}>
        <Heart size={19} fill={liked ? 'currentColor' : 'none'} /><span>{post.likeCount + Number(liked) - Number(post.liked)}</span>
      </button>
      <button type="button" onClick={onComment} aria-label={en ? 'Preview comments' : '查看评论预览'}>
        <MessageCircle size={19} /><span>{post.commentCount}</span>
      </button>
      <button type="button" className={favorited ? 'is-favorited' : ''} aria-pressed={favorited} aria-label={en ? 'Save (temporary demo)' : '收藏（临时演示）'} onClick={onFavorite}>
        <Star size={19} fill={favorited ? 'currentColor' : 'none'} /><span>{post.favoriteCount + Number(favorited) - Number(post.favorited)}</span>
      </button>
      <button type="button" disabled aria-label={en ? 'Sharing is not connected yet' : '分享暂未接入'} title={en ? 'Sharing will be available with real posts' : '真实帖子接入后支持复制详情链接'}>
        <Share2 size={18} />
      </button>
    </div>
  );
}

export default function CampusNewsCard({ post, liked, favorited, onLike, onFavorite, onOpen }) {
  return (
    <article className="campus-news-card" aria-labelledby={`${post.id}-title`} onClick={(event) => {
      if (!event.target.closest('button, a, .campus-news-media-wrap') && !window.getSelection()?.toString()) onOpen();
    }}>
      <CampusNewsIdentity category={post.category} audience={post.audience} createdAt={post.createdAt} />
      <div className="campus-news-card__body">
        <h3 id={`${post.id}-title`} className="campus-news-card__title">
          <button type="button" onClick={onOpen}>{post.title}</button>
        </h3>
        <p className="campus-news-card__excerpt">{post.content}</p>
        <CampusNewsMedia images={post.images} />
        <CampusNewsActions post={post} liked={liked} favorited={favorited} onLike={onLike} onFavorite={onFavorite} onComment={onOpen} />
      </div>
    </article>
  );
}
