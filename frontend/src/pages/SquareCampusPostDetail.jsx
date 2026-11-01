import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loginPath } from '../utils/loginReturn';
import CampusShareButton from '../features/campus-news/CampusShareButton';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import {
  getCampusPostDetail,
} from '@shared/api/square';
import { useCampusLike } from '../features/campus-news/useCampusLike';
import { API_BASE_URL, getUploadUrl } from '@shared/api/config';
import CampusComments from '../features/campus-news/CampusComments';
import CampusFavoriteButton from '../features/campus-news/CampusFavoriteButton';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import PostDetailShell from '../components/PostDetailShell';

function prefixAvatar(url) {
  return url && !url.startsWith('http') ? `${API_BASE_URL}${url}` : url;
}

export default function SquareCampusPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, token, user, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const postId = parseInt(id, 10);
  const tokenKey = token ?? 'guest';


  const detailQuery = useQuery({
    queryKey: QK.campusPostDetail(postId, tokenKey),
    queryFn: () => getCampusPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 30 * 1000,
    select: (data) => {
      const post = data?.data || data || {};
      return {
        ...post,
        author: post.author
          ? { ...post.author, avatar: prefixAvatar(post.author.avatar) }
          : post.author,
        organization: post.organization
          ? { ...post.organization, avatar: prefixAvatar(post.organization.avatar) }
          : post.organization,
      };
    },
  });


  const post = detailQuery.data ?? null;

  const like = useCampusLike({ id: postId, real: Boolean(post) });


  const org = post?.organization;
  const feedLabel =
    post?.feed_tab === 'college'
      ? (isEn ? 'College Updates' : '学院通知')
      : post?.feed_tab === 'school'
        ? (isEn ? 'School Bulletin' : '学校公告')
        : '';

  const headerSlot =
    org && org.name ? (
      <div className="post-detail-org-header">
        {org.avatar ? (
          <img src={getUploadUrl(org.avatar)} alt="" className="post-detail-org-avatar" />
        ) : null}
        <div className="post-detail-org-meta">
          <span className="post-detail-org-name">{org.name}</span>
          <span className="post-detail-org-badge">{isEn ? 'Verified official' : '官方认证'}</span>
        </div>
      </div>
    ) : null;

  return (<>
    {like.error && <p role="alert">{like.error}<button type="button" onClick={() => like.retry()}>重试</button></p>}
    <PostDetailShell
      post={post}
      commentsSlot={<CampusComments postId={postId} />}
      loading={detailQuery.isPending && !post}
      error={detailQuery.error ? getApiErrorMessage(detailQuery.error) : null}
      liked={like.liked === true}
      likeCount={like.likeCount ?? post?.like_count ?? 0}
      likePending={like.pending || !like.canLike}
      onLike={like.onLike}
      isLoggedIn={isLoggedIn}
      user={user}
      isAdmin={isAdmin}
      loginPath={loginPath(location)}
      emptyTitle={isEn ? 'Notice not found' : '通知不存在'}
      emptyActionLabel={isEn ? 'Back to square' : '返回广场'}
      onEmptyAction={() => navigate('/about')}
      headerSlot={<>{headerSlot}{post?.category && <div className="campus-news-actions"><CampusFavoriteButton postId={postId} /><CampusShareButton postId={postId} /></div>}</>}
      title={post?.title || null}
      metaSlot={feedLabel ? ` · ${feedLabel}` : null}
      reportTargetType="campus_post"
      commentReportType="campus_comment"
    /></>
  );
}
