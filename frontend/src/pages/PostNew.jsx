import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostNew.css';

/** 发布帖子页：需登录；上方文本框，下方图片区域（最多 3 张） */
function PostNew() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/post/new' } }} />;
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - images.length);
    if (files.length === 0) return;
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newUrls].slice(0, 3));
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/post/new' } }, replace: true });
      return;
    }
    // TODO: 调用发布接口
    console.log('发布', { content, imageCount: images.length });
  };

  return (
    <div className="postnew-page">
      <p className="postnew-anonymous-hint">
        发帖为匿名。他人点赞或评论时，会在「信箱」中收到提醒。Posts are anonymous; you’ll get like/comment notifications in Mailbox.
      </p>
      <form className="postnew-form" onSubmit={handleSubmit}>
        <div className="postnew-section">
          <label className="postnew-label">内容 Content</label>
          <textarea
            className="postnew-textarea"
            placeholder="写点什么… Share something…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>
        <div className="postnew-section">
          <label className="postnew-label">图片 Pictures（最多 3 张 / up to 3）</label>
          <div className="postnew-images">
            {images.map((url, i) => (
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
            {images.length < 3 && (
              <label className="postnew-image-add">
                <input
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
        <button type="submit" className="postnew-submit">
          发布 Post
        </button>
      </form>
    </div>
  );
}

export default PostNew;
