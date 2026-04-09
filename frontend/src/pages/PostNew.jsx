import { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { createPost, getPostTagsList } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import './PostNew.css';

/** 发布帖子 / 公告页：需登录；普通用户发帖子，管理员发公告 */
function PostNew() {
  const queryClient = useQueryClient();
  const { isLoggedIn, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getPostTagsList()
      .then((d) => setAllTags(Array.isArray(d) ? d : []))
      .catch(() => setAllTags([]));
  }, []);

  const tagLabel = (t) => (isEn ? (t.name_en || t.name_zh) : (t.name_zh || t.name_en));

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((x) => x !== tagId);
      if (prev.length >= 3) {
        Toast.error(isEn ? 'Up to 3 tags' : '最多选择 3 个标签');
        return prev;
      }
      return [...prev, tagId];
    });
  };

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/post/new' } }} />;
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - imageFiles.length);
    if (files.length === 0) return;
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
    setPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      Toast.error('请输入内容');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        content: trimmed,
        images: imageFiles.length ? imageFiles : undefined,
      };
      // 管理员只能发布公告
      if (isAdmin) {
        payload.type = 'announcement';
      } else if (selectedTagIds.length > 0) {
        payload.tagIds = selectedTagIds;
      }
      const created = await createPost(payload);
      Toast.success(isAdmin ? '公告发布成功' : '发布成功');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(created?.id ? `/post/${created.id}` : '/', { replace: true });
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="postnew-page">
      <p className="postnew-anonymous-hint">
        {isAdmin
          ? '发布公告后，所有用户在登录时会弹出提示，并在「信箱」中长期保存。Announcements will be shown to all users on login.'
          : '发帖为匿名。他人点赞或评论时，会在「信箱」中收到提醒。Posts are anonymous; you will get like/comment notifications in Mailbox.'}
      </p>
      <form className="postnew-form" onSubmit={handleSubmit}>
        {!isAdmin && allTags.length > 0 && (
          <div className="postnew-section">
            <label className="postnew-label">
              {isEn ? 'Tags (max 3) 标签（最多3个）' : '标签 Tags（最多 3 个 / max 3）'}
            </label>
            <p className="postnew-tag-hint">
              {isEn
                ? 'Tap to select. Only admins can create tags.'
                : '点击选择；仅管理员可创建标签。'}
            </p>
            <div className="postnew-tag-pool">
              {allTags.map((t) => {
                const on = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`postnew-tag-chip ${on ? 'postnew-tag-chip--on' : ''}`}
                    onClick={() => toggleTag(t.id)}
                  >
                    {tagLabel(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="postnew-section">
          <label className="postnew-label">{isAdmin ? '公告内容 Announcement' : '内容 Content'}</label>
          <textarea
            className="postnew-textarea"
            placeholder={isAdmin ? '写下要通知全站的内容…' : '写点什么… Share something…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>
        <div className="postnew-section">
          <label className="postnew-label">图片 Pictures（最多 3 张 / up to 3）</label>
          <div className="postnew-images">
            {previewUrls.map((url, i) => (
              <div key={url} className="postnew-image-wrap">
                <img src={url} alt="" className="postnew-image" />
                <button
                  type="button"
                  className="postnew-image-remove"
                  onClick={() => removeImage(i)}
                  aria-label="移除 Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {previewUrls.length < 3 && (
              <label className="postnew-image-add">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="postnew-file-input"
                />
                <span className="postnew-image-add-inner">+</span>
              </label>
            )}
          </div>
        </div>
        <button type="submit" className="postnew-submit pressable" disabled={loading}>
          {loading ? (isAdmin ? '发布公告中…' : '发布中…') : (isAdmin ? '发布公告 Announcement' : '发布 Post')}
        </button>
      </form>
    </div>
  );
}

export default PostNew;
