import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { getMyOrganizations } from '@shared/api/organizations';
import { postCampusPost } from '@shared/api/square';
import { QK } from '@shared/query/queryKeys';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Label from '../components/ui/Label';
import Card from '../components/ui/Card';
import NeoTab from '../components/retroui/Tab';

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
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="square-section-title m-0">{isEn ? 'Publish Campus Notice' : '发布校园通知'}</h3>

          <NeoTab
            value={tab}
            onValueChange={(v) => { setTab(v); setOrgId(''); }}
            className="w-full"
          >
            <NeoTab.List className="flex flex-row gap-2 w-full">
              {tabItems.map((item) => (
                <NeoTab.Trigger key={item.key} value={item.key} className="flex-1 justify-center">
                  {item.label}
                </NeoTab.Trigger>
              ))}
            </NeoTab.List>
          </NeoTab>

          {isLoading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="state-loading" style={{ paddingTop: 40 }} />
            </div>
          ) : availableOrgs.length === 0 ? (
            <div className="state-empty">
              {tab === 'college'
                ? (isEn ? 'You do not have permission to post as a college organization' : '你没有学院组织的发帖权限')
                : (isEn ? 'You do not have permission to post as an official school organization' : '你没有学校官方组织的发帖权限')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-[13px] text-[var(--post-ios-secondary-label)]">
                  {isEn ? 'Posting as' : '发布身份'}
                </Label>
                <Select
                  className="w-full"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                >
                  {availableOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.title || (isEn ? 'Member' : '成员')})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[13px] text-[var(--post-ios-secondary-label)]">
                  {isEn ? 'Title' : '标题'}
                </Label>
                <Input
                  type="text"
                  className="w-full"
                  placeholder={isEn ? 'Enter title...' : '输入标题...'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[13px] text-[var(--post-ios-secondary-label)]">
                  {isEn ? 'Content' : '内容'}
                </Label>
                <Textarea
                  className="min-h-[120px] resize-y w-full"
                  placeholder={isEn ? 'Enter content... (line breaks supported)' : '输入正文...（支持换行）'}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                />
              </div>

              {previews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previews.map((url, index) => (
                    <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white border-0 cursor-pointer text-xs flex items-center justify-center"
                        aria-label={isEn ? 'Remove image' : '删除图片'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isEn ? `Add image / GIF (${files.length}/3)` : `添加图片/GIF (${files.length}/3)`}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {error && <p className="text-[var(--post-ios-red)] text-[13px] m-0 mt-2">{error}</p>}

              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !title.trim() || !content.trim() || !orgId}
              >
                {submitting ? (isEn ? 'Publishing...' : '发布中...') : (isEn ? 'Publish' : '发布')}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}