import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../context/ToastContext';
import { createPost } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import './PostNew.css';

/** 发布帖子 / 公告页：需登录；普通用户发帖子，管理员发公告 */
function PostNew() {
  const { isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

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
      }
      const created = await createPost(payload);
      Toast.success(isAdmin ? '公告发布成功' : '发布成功');
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
