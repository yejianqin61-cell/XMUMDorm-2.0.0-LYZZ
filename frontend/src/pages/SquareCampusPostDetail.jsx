import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCampusPostDetail } from '../api/square';
import { QK } from '../query/queryKeys';
import { getUploadUrl } from '../api/config';
import { formatPostTime } from '../utils/formatTime';
import './SquareHome.css';

export default function SquareCampusPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const postId = parseInt(id, 10);

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.campusPostDetail(postId),
    queryFn: () => getCampusPostDetail(postId),
    staleTime: 30 * 1000,
  });
  const post = data?.data || data || {};

  if (isLoading) {
    return (
      <div className="square-home-page">
        <div className="square-home-inner">
          <div className="state-loading" style={{ paddingTop: 80 }} />
        </div>
      </div>
    );
  }

  if (isError || !post.id) {
    return (
      <div className="square-home-page">
        <div className="square-home-inner">
          <div className="state-error" style={{ padding: 40, textAlign: 'center' }}>帖子不存在或已删除</div>
        </div>
      </div>
    );
  }

  const images = post.images || [];
  const org = post.organization || {};

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section">
          {/* Organization badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {org.avatar && (
              <img src={getUploadUrl(org.avatar)} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--post-ios-label)' }}>
                  📢 {org.name || ''}
                </span>
                <span style={{ fontSize: 11, color: '#fff', background: 'var(--post-ios-system-blue, #007aff)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  官方认证
                </span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--post-ios-label)', margin: '0 0 8px' }}>
            {post.title}
          </h2>

          {/* Meta */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--post-ios-tertiary-label)', marginBottom: 16 }}>
            <span>{post.author?.name || '匿名'}</span>
            <span>{formatPostTime(post.created_at)}</span>
            <span style={{ textTransform: 'capitalize' }}>
              {post.feed_tab === 'college' ? '学院通知' : '学校公告'}
            </span>
          </div>

          {/* Content */}
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--post-ios-label)', margin: '0 0 16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {post.content}
          </p>

          {/* Images */}
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={getUploadUrl(img.url)}
                  alt=""
                  style={{ width: images.length === 1 ? '100%' : 120, maxHeight: 240, borderRadius: 12, objectFit: 'cover' }}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
