import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { postTrendingPost } from '@shared/api/square';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import './SquareTrendingPostNew.css';

export default function SquareTrendingPostNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
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
      setError(isEn ? 'You can upload up to 3 images' : '最多上传3张图片');
      return;
    }
    const newPreviews = selected.map((file) => URL.createObjectURL(file));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const goBack = () => {
    navigate(`/about/trending/${id}`);
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
      setError(err.message || (isEn ? 'Publish failed' : '发布失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="trending-post-new-page">
      <header className="trending-post-new-header">
        <button
          type="button"
          className="trending-post-new-back pressable"
          onClick={goBack}
          aria-label={isEn ? 'Back to discussion' : '返回讨论'}
          title={isEn ? 'Back to discussion' : '返回讨论'}
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h1>{isEn ? 'Join discussion' : '参与讨论'}</h1>
        <button
          type="submit"
          form="trending-post-form"
          className="trending-post-new-submit pressable"
          disabled={submitting || !content.trim()}
        >
          {submitting ? (isEn ? 'Posting' : '发布中') : (isEn ? 'Post' : '发布')}
        </button>
      </header>

      <main className="trending-post-new-composer">
        <form id="trending-post-form" onSubmit={handleSubmit}>
            <textarea
              className="trending-post-new-textarea"
              placeholder={isEn ? 'Share your thoughts' : '写下你的想法'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            {previews.length > 0 && (
              <div className="trending-post-new-previews">
                {previews.map((url, index) => (
                  <div key={url} className="trending-post-new-preview">
                    <img src={url} alt="" />
                    <button
                      type="button"
                      className="trending-post-new-remove pressable"
                      onClick={() => removeFile(index)}
                      aria-label={isEn ? 'Remove image' : '删除图片'}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {error && <p className="trending-post-new-error">{error}</p>}
          </form>
        </main>

      <footer className="trending-post-new-tools">
        <button
          type="button"
          className="trending-post-new-image-button pressable"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= 3}
          aria-label={isEn ? 'Add image or GIF' : '添加图片或 GIF'}
          title={isEn ? 'Add image or GIF' : '添加图片或 GIF'}
        >
          <ImagePlus size={28} strokeWidth={1.8} aria-hidden />
        </button>
        <span className="trending-post-new-count">{content.length}/2000</span>
      </footer>
    </div>
  );
}
