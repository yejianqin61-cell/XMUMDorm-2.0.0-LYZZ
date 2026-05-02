import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, Heart, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { queryClient } from '../../query/queryClient';
import { Toast } from '../../context/ToastContext';
import { getClubPostDetail, toggleClubLike, trackClubView } from '../../api/clubs';
import { getApiErrorMessage } from '../../utils/apiError';
import './Clubs.css';

function ClubPostDetail() {
  const { id } = useParams();
  const postId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['clubs', 'post', postId],
    queryFn: async () => await getClubPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
  });

  const p = q.data;
  const liked = !!p?.viewer?.liked;

  useEffect(() => {
    if (!postId) return;
    trackClubView('post', postId).catch(() => {});
  }, [postId]);

  const postQK = ['clubs', 'post', postId];

  const likeMut = useMutation({
    mutationFn: async () => await toggleClubLike('post', postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: postQK });
      const prev = queryClient.getQueryData(postQK);
      queryClient.setQueryData(postQK, (old) => {
        if (!old) return old;
        const nextLiked = !old.viewer?.liked;
        const base = Number(old.stats?.likes ?? 0);
        const likes = Math.max(0, base + (nextLiked ? 1 : -1));
        return {
          ...old,
          viewer: { ...old.viewer, liked: nextLiked },
          stats: { ...old.stats, likes },
        };
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(postQK, ctx.prev);
      Toast.error(getApiErrorMessage(err));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: postQK });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
    },
  });

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !p) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '日常' : 'Post'}</div>
        <Link className="club-profile-link" to={`/about/club/${p.clubId}`}>{isZh ? '社团' : 'Club'}</Link>
      </div>

      <div className="club-profile-card">
        <div className="club-feed-sub">{p.clubName}</div>
        <div className="club-detail-desc club-wrap">{p.content}</div>

        {Array.isArray(p.images) && p.images.length ? (
          <div className="club-img-grid">
            {p.images.map((src) => (
              <img key={src} src={src} alt="" className="club-img" loading="lazy" decoding="async" />
            ))}
          </div>
        ) : (
          <div className="club-mini-empty">
            <ImageIcon size={16} aria-hidden /> {isZh ? '无图片' : 'No images'}
          </div>
        )}

        <div className="club-detail-actions">
          <button
            type="button"
            className={`club-like-btn pressable ${liked ? 'is-on' : ''}`}
            disabled={!token || likeMut.isPending}
            onClick={() => likeMut.mutate()}
            title={!token ? (isZh ? '登录后可点赞' : 'Login to like') : (isZh ? '点赞' : 'Like')}
          >
            <Heart size={18} aria-hidden />
            <span>{p.stats?.likes ?? 0}</span>
          </button>
          <div className="club-like-meta">
            <Eye size={18} aria-hidden /> <span>{p.stats?.views ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClubPostDetail;

