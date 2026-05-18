import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postTrendingPost } from '../api/square';

export default function SquareTrendingPostNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      await postTrendingPost(parseInt(id, 10), { content: text });
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
              placeholder="写下你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              autoFocus
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
