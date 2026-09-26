import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { postTrendingPost } from '@shared/api/square';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import NeoButton from '../components/retroui/Button';
import NeoTextarea from '../components/retroui/Textarea';
import NeoCard from '../components/retroui/Card';

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
    <div className="square-home-page">
      <div className="square-home-inner">
        <NeoCard className="p-5 flex flex-col gap-4">
          <h3 className="text-xl font-black tracking-tight m-0">{isEn ? 'Join Discussion' : '参与讨论'}</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <NeoTextarea
              className="min-h-[120px] resize-y"
              placeholder={isEn ? 'Share your thoughts... (line breaks supported)' : '写下你的想法...（支持换行）'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            {previews.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {previews.map((url, index) => (
                  <div key={url} className="relative w-20 h-20 border-2 border-black overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white border-0 cursor-pointer text-xs flex items-center justify-center font-black"
                      aria-label={isEn ? 'Remove image' : '删除图片'}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < 3 && (
              <NeoButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {isEn ? `Add image / GIF (${files.length}/3)` : `添加图片/GIF (${files.length}/3)`}
              </NeoButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {error && <p className="text-red-500 text-sm font-bold m-0 mt-2 border-2 border-red-500 p-2">{error}</p>}
            <NeoButton
              type="submit"
              variant="default"
              disabled={submitting || !content.trim()}
            >
              {submitting ? (isEn ? 'Posting...' : '发布中...') : (isEn ? 'Post' : '发布')}
            </NeoButton>
          </form>
        </NeoCard>
      </div>
    </div>
  );
}