import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { getMyOrganizations } from '@shared/api/organizations';
import { postCampusPost } from '@shared/api/square';
import { QK } from '@shared/query/queryKeys';

export default function SquareCampusPostNew() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get('tab') || 'school';
  const [tab, setTab] = useState(defaultTab);
  const [orgId, setOrgId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.myOrganizations(),
    queryFn: getMyOrganizations,
    staleTime: 60 * 1000,
  });
  const orgs = Array.isArray(data) ? data : data?.data || [];

  const allowedTypes = tab === 'college' ? ['College'] : ['SchoolDepartment', 'Official'];
  const availableOrgs = orgs.filter((org) => allowedTypes.includes(org.type));

  useEffect(() => {
    if (availableOrgs.length > 0 && !orgId) {
      setOrgId(String(availableOrgs[0].id));
    }
  }, [availableOrgs, orgId]);

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
    if (!orgId || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await postCampusPost({
        organization_id: parseInt(orgId, 10),
        feed_tab: tab,
        title: title.trim(),
        content: content.trim(),
      }, files.length > 0 ? files : null);
      navigate('/about', { replace: true });
    } catch (err) {
      setError(err.message || (isEn ? 'Publish failed' : '发布失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    { key: 'school', label: isEn ? 'School Bulletin' : '学校公告' },
    { key: 'college', label: isEn ? 'College Updates' : '学院通知' },
  ];

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-section">
          <h3 className="square-section-title">{isEn ? 'Publish Campus Notice' : '发布校园通知'}</h3>

          <div className="square-campus-tabs" style={{ marginBottom: 12 }}>
            {tabItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`square-campus-tab${tab === item.key ? ' square-campus-tab--active' : ''}`}
                onClick={() => { setTab(item.key); setOrgId(''); }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="state-loading" style={{ paddingTop: 40 }} />
          ) : availableOrgs.length === 0 ? (
            <div className="state-empty">
              {tab === 'college'
                ? (isEn ? 'You do not have permission to post as a college organization' : '你没有学院组织的发帖权限')
                : (isEn ? 'You do not have permission to post as an official school organization' : '你没有学校官方组织的发帖权限')}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{ fontSize: 13, color: 'var(--post-ios-secondary-label)', display: 'block', marginBottom: 4 }}>
                {isEn ? 'Posting as' : '发布身份'}
              </label>
              <select
                className="canteen-search-input"
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {availableOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.title || (isEn ? 'Member' : '成员')})
                  </option>
                ))}
              </select>

              <label style={{ fontSize: 13, color: 'var(--post-ios-secondary-label)', display: 'block', marginBottom: 4 }}>
                {isEn ? 'Title' : '标题'}
              </label>
              <input
                type="text"
                className="canteen-search-input"
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
                placeholder={isEn ? 'Enter title...' : '输入标题...'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />

              <label style={{ fontSize: 13, color: 'var(--post-ios-secondary-label)', display: 'block', marginBottom: 4 }}>
                {isEn ? 'Content' : '内容'}
              </label>
              <textarea
                className="canteen-search-input"
                style={{ width: '100%', minHeight: 120, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder={isEn ? 'Enter content... (line breaks supported)' : '输入正文...（支持换行）'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
              />

              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {previews.map((url, index) => (
                    <div key={url} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        style={{
                          position: 'absolute', top: 2, right: 2,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        aria-label={isEn ? 'Remove image' : '删除图片'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length < 3 && (
                <button
                  type="button"
                  className="canteen-food-compose-btn pressable"
                  style={{ marginTop: 8 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isEn ? `Add image / GIF (${files.length}/3)` : `添加图片/GIF (${files.length}/3)`}
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
                disabled={submitting || !title.trim() || !content.trim() || !orgId}
                style={{ marginTop: 12, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? (isEn ? 'Publishing...' : '发布中...') : (isEn ? 'Publish' : '发布')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
