import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, Heart, MessageCircle, Trash2 } from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { queryClient } from '../../query/queryClient';
import { Toast } from '../../context/ToastContext';
import { deleteClubPost, getClubPostDetail, toggleClubLike, trackClubView } from '../../api/clubs';
import { getApiErrorMessage } from '../../utils/apiError';
import { API_BASE_URL } from '../../api/config';
import ImagePreview from '../../components/ImagePreview';
import { StackedCardCarousel } from '../../components/StackedCardCarousel';
import ClubCommentsSection from './ClubCommentsSection';
import '../PostDetail.css';
import './Clubs.css';

function prefixImageUrl(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

function ClubPostDetail() {
  const { id } = useParams();
  const postId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token, user } = useAuth();
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);

  const q = useQuery({
    queryKey: ['clubs', 'post', postId],
    queryFn: async () => await getClubPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
  });

  const p = q.data;
  const liked = !!p?.viewer?.liked;
  const canManage = !!p?.viewer?.canManage || user?.role === 'admin';

  const imageUrls = useMemo(() => {
    if (!p?.images || !Array.isArray(p.images)) return [];
    const from = p.images.map((x) => (typeof x === 'string' ? x : x?.url)).filter(Boolean);
    return from.map((u) => prefixImageUrl(u)).filter(Boolean);
  }, [p?.images]);

  useEffect(() => {
    setCarouselIndex(0);
    setCarouselDir(1);
  }, [postId]);

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

  const deleteMut = useMutation({
    mutationFn: async () => await deleteClubPost(postId),
    onSuccess: async () => {
      Toast.success(isZh ? '已删除' : 'Deleted');
      const snap = queryClient.getQueryData(postQK);
      const cid = snap?.clubId;
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      if (cid) nav(`/about/club/${cid}`, { replace: true });
      else nav(-1);
    },
    onError: (err) => Toast.error(getApiErrorMessage(err)),
  });

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !p) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page club-page--floating-comments">
      <div className="club-activity-detail-main">
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

          {imageUrls.length > 0 ? (
            <div className="post-detail-media" aria-label={isZh ? '帖子配图' : 'Post images'}>
              {imageUrls.length === 1 ? (
                <button
                  type="button"
                  className="post-detail-image-wrap"
                  onClick={() => setImagePreview({ open: true, index: 0 })}
                >
                  <img src={imageUrls[0]} alt="" className="post-detail-image" />
                </button>
              ) : (
                <StackedCardCarousel
                  urls={imageUrls}
                  index={carouselIndex}
                  onChangeIndex={(next, dir) => {
                    setCarouselDir(dir);
                    setCarouselIndex(next);
                  }}
                  onOpenPreview={(i) => setImagePreview({ open: true, index: i })}
                  dir={carouselDir}
                />
              )}
            </div>
          ) : null}

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
              <MessageCircle size={18} aria-hidden /> <span>{p.stats?.comments ?? 0}</span>
            </div>
            <div className="club-like-meta">
              <Eye size={18} aria-hidden /> <span>{p.stats?.views ?? 0}</span>
            </div>
            {canManage ? (
              <button
                type="button"
                className="club-delete-btn pressable"
                disabled={deleteMut.isPending}
                onClick={() => {
                  if (window.confirm(isZh ? '确定删除该日常帖？删除后不可恢复。' : 'Delete this post? This cannot be undone.')) {
                    deleteMut.mutate();
                  }
                }}
              >
                <Trash2 size={16} aria-hidden />
                <span>{isZh ? '删除' : 'Delete'}</span>
              </button>
            ) : null}
            <ReportButton target_type="club_post" target_id={postId} className="text-slate-400 hover:text-red-500" />
          </div>
        </div>
      </div>

      <ClubCommentsSection targetType="post" targetId={postId} isZh={isZh} floatingComposer fillVertical />

      {imagePreview.open && imageUrls.length > 0 ? (
        <ImagePreview urls={imageUrls} initialIndex={imagePreview.index} onClose={() => setImagePreview({ open: false, index: 0 })} />
      ) : null}
    </div>
  );
}

export default ClubPostDetail;
