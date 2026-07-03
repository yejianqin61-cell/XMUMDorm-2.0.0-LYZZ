import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { QK } from '../../query/queryKeys';
import { createClubPost, getClubProfile } from '@shared/api/clubs';
import { queryClient } from '../../query/queryClient';
import { getApiErrorMessage } from '../../utils/apiError';
import ImagePreview from '../../components/ImagePreview';
import { StackedCardCarousel } from '../../components/StackedCardCarousel';
import '../PostDetail.css';
import './Clubs.css';

function PublishClubPost() {
  const [searchParams] = useSearchParams();
  const clubId = Number(searchParams.get('clubId') || '');
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token, user, isAdmin: siteAdmin } = useAuth();
  const canManageFromAuth = siteAdmin || user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselDir, setCarouselDir] = useState(1);
  const [imagePreview, setImagePreview] = useState({ open: false, index: 0 });
  const fileInputRef = useRef(null);
  const missingClubToastRef = useRef(false);

  const q = useQuery({
    queryKey: QK.clubProfile(clubId),
    queryFn: async () => await getClubProfile(clubId),
    enabled: Number.isFinite(clubId) && clubId > 0 && !!token,
  });

  const basic = q.data?.basicInfo;
  const canManage = !!basic?.viewer?.canManage || canManageFromAuth;

  useEffect(() => {
    if ((!Number.isFinite(clubId) || clubId <= 0) && !missingClubToastRef.current) {
      missingClubToastRef.current = true;
      Toast.error(isZh ? '请从社团主页进入发布页' : 'Open publish from a club page');
    }
  }, [clubId, isZh]);

  useEffect(() => {
    if (q.isSuccess && basic && !canManage) {
      Toast.error(isZh ? '无权限发布' : 'No permission');
      nav(`/about/club/${clubId}`, { replace: true });
    }
  }, [q.isSuccess, basic, canManage, clubId, nav, isZh]);

  const postMut = useMutation({
    mutationFn: async () =>
      await createClubPost(clubId, { title: title.trim(), content: content.trim() }, imageFiles),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      const newId = data?.id;
      Toast.success(isZh ? '发布成功' : 'Published');
      if (newId) nav(`/about/club/post/${newId}`, { replace: true });
      else nav(`/about/club/${clubId}`, { replace: true });
    },
    onError: (err) => {
      Toast.error(getApiErrorMessage(err));
    },
  });

  const handleImageChange = (e) => {
    const picked = Array.from(e.target.files || []);
    const room = 4 - imageFiles.length;
    if (room <= 0 || picked.length === 0) return;
    const slice = picked.slice(0, room);
    const newUrls = slice.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...slice]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setCarouselIndex(0);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!Number.isFinite(clubId) || clubId <= 0) return;
    if (!content.trim()) {
      Toast.error(isZh ? '请填写正文' : 'Content is required');
      return;
    }
    postMut.mutate();
  };

  if (!token) {
    return (
      <div className="club-page">
        <div className="state-empty">{isZh ? '请先登录' : 'Please log in'}</div>
      </div>
    );
  }

  if (!Number.isFinite(clubId) || clubId <= 0) {
    return (
      <div className="club-page publish-activity-page">
        <div className="club-profile-top">
          <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
            <ArrowLeft size={18} aria-hidden />
          </button>
          <div className="club-profile-title">{isZh ? '发布日常' : 'New post'}</div>
          <Link className="club-profile-link" to="/about/club">{isZh ? '广场' : 'Square'}</Link>
        </div>
        <p className="publish-activity-hint">{isZh ? '请从社团资料页进入。' : 'Open from a club profile.'}</p>
        <Link to="/about/club/list" className="club-members-more pressable">
          {isZh ? '去社团列表' : 'Club list'}
        </Link>
      </div>
    );
  }

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !basic) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page publish-activity-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{isZh ? '发布日常' : 'New post'}</div>
        <Link className="club-profile-link" to={`/about/club/${clubId}`}>
          {isZh ? '社团' : 'Club'}
        </Link>
      </div>

      <div className="club-profile-card">
        <div className="publish-activity-club">{basic.name}</div>

        <form className="club-admin-form publish-activity-form" onSubmit={submit}>
          <label className="club-field">
            <div className="club-label">{isZh ? '标题（可选）' : 'Title (optional)'}</div>
            <input className="club-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </label>
          <label className="club-field">
            <div className="club-label">{isZh ? '正文' : 'Content'}</div>
            <textarea className="club-textarea" rows={8} value={content} onChange={(e) => setContent(e.target.value)} maxLength={8000} />
          </label>

          <div className="club-field">
            <div className="club-label">{isZh ? '图片（最多 4 张）' : 'Images (max 4)'}</div>
            <div className="publish-activity-images">
              {previewUrls.map((url, i) => (
                <div key={url} className="publish-activity-thumb">
                  <img src={url} alt="" />
                  <button type="button" className="publish-activity-thumb-remove" onClick={() => removeImage(i)} aria-label={isZh ? '移除' : 'Remove'}>
                    ×
                  </button>
                </div>
              ))}
              {previewUrls.length < 4 ? (
                <button type="button" className="publish-activity-add-img pressable" onClick={() => fileInputRef.current?.click()}>
                  <PlusCircle size={22} aria-hidden />
                  <span>{isZh ? '添加' : 'Add'}</span>
                </button>
              ) : null}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="publish-activity-file-input" onChange={handleImageChange} />
            </div>
          </div>

          {previewUrls.length > 0 ? (
            <div className="publish-activity-preview-block">
              <div className="club-label">{isZh ? '预览' : 'Preview'}</div>
              <div className="post-detail-media">
                {previewUrls.length === 1 ? (
                  <button type="button" className="post-detail-image-wrap" onClick={() => setImagePreview({ open: true, index: 0 })}>
                    <img src={previewUrls[0]} alt="" className="post-detail-image" />
                  </button>
                ) : (
                  <StackedCardCarousel
                    urls={previewUrls}
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
            </div>
          ) : null}

          {imagePreview.open && previewUrls.length > 0 ? (
            <ImagePreview urls={previewUrls} initialIndex={imagePreview.index} onClose={() => setImagePreview({ open: false, index: 0 })} />
          ) : null}

          <button type="submit" className="club-admin-submit pressable" disabled={!content.trim() || postMut.isPending}>
            <PlusCircle size={16} aria-hidden />
            {postMut.isPending ? (isZh ? '发布中…' : 'Posting…') : (isZh ? '发布' : 'Publish')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PublishClubPost;
