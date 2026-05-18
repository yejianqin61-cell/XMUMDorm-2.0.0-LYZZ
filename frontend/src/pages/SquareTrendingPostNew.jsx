import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postTrendingPost } from '../api/square';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { getUploadUrl } from '../api/config';

export default function SquareTrendingPostNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { handleExpResponse } = useExpFeedback();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 3) {
      setError('最多上传3张图片');
      return;
    }
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await postTrendingPost(parseInt(id, 10), { content: text }, files.length > 0 ? files : null);
      handleExpResponse(res);
      navigate(`/about/trending/${id}`, { replace: true });
    } catch (err) {
      setError(err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section">
          <h3 className="square-section-title">参与讨论</h3>
          <form onSubmit={handleSubmit}>
            <textarea
              className="canteen-search-input"
              style={{ width: '100%', minHeight: 120, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="写下你的想法...（支持换行）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            {/* Image previews */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image upload button */}
            {files.length < 3 && (
              <button
                type="button"
                className="canteen-food-compose-btn pressable"
                style={{ marginTop: 8 }}
                onClick={() => fileInputRef.current?.click()}
              >
                添加图片/GIF ({files.length}/3)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {error && <p style={{ color: 'var(--post-ios-red)', fontSize: 13, margin: '8px 0' }}>{error}</p>}
            <button
              type="submit"
              className="canteen-pick-btn pressable"
              disabled={submitting || !content.trim()}
              style={{ marginTop: 12, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? '发布中...' : '发布'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
