import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Send } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Tag from '../components/ui/Tag';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { Toast } from '../context/toast';
import { useExpFeedback } from '../context/ExpFeedbackContextState';
import { createPost, getPostTagsList } from '@shared/api/posts';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '@shared/constants/canteen';
import { POST_REPOST_SOURCES, POST_REPOST_SOURCE_MAX_LENGTH } from '@shared/constants/postAttribution';
import { acceptCurrentTerms, getMyTermsStatus } from '@shared/api/users';
import { buildPostAttribution } from '../utils/postAttribution';
import TermsAcceptanceGate from '../components/TermsAcceptanceGate';
import './PostNew.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

export default function PostNew() {
  const queryClient = useQueryClient();
  const { isLoggedIn, isAdmin, token } = useAuth();
  const { handleExpResponse } = useExpFeedback();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectTagSlug = (searchParams.get('tag') || '').trim();
  const tokenKey = token ?? 'guest';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentOrigin, setContentOrigin] = useState('original');
  const [repostSource, setRepostSource] = useState('WX');
  const [customSource, setCustomSource] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [imageNotice, setImageNotice] = useState('');
  const previewUrlsRef = useRef([]);

  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const fileInputRef = useRef(null);
  const [termsStatus, setTermsStatus] = useState(null);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsAccepting, setTermsAccepting] = useState(false);
  const [termsError, setTermsError] = useState('');

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const loadTermsStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setTermsStatus(null);
      setTermsLoading(false);
      return;
    }

    setTermsLoading(true);
    setTermsError('');
    try {
      setTermsStatus(await getMyTermsStatus());
    } catch (error) {
      setTermsStatus(null);
      setTermsError(getApiErrorMessage(error));
    } finally {
      setTermsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadTermsStatus();
  }, [loadTermsStatus]);

  const handleAcceptTerms = async () => {
    if (!termsStatus?.version) return;

    setTermsAccepting(true);
    setTermsError('');
    try {
      setTermsStatus(await acceptCurrentTerms(termsStatus.version));
    } catch (error) {
      setTermsError(getApiErrorMessage(error));
    } finally {
      setTermsAccepting(false);
    }
  };

  const { data: allTags = [] } = useQuery({
    queryKey: QK.postTagsList(),
    queryFn: getPostTagsList,
    staleTime: POST_TAGS_STALE_MS,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const tagLabel = (tag) => (isEn ? tag.name_en || tag.name_zh : tag.name_zh || tag.name_en);

  useEffect(() => {
    if (!preselectTagSlug || !allTags.length) return;
    const targetTag = allTags.find((item) => item.slug === preselectTagSlug);
    if (!targetTag) return;
    setSelectedTagIds((prev) => {
      if (prev.includes(targetTag.id) || prev.length >= 3) return prev;
      return [...prev, targetTag.id];
    });
  }, [preselectTagSlug, allTags]);

  const toggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((item) => item !== tagId));
    } else if (selectedTagIds.length >= 3) {
      Toast.error(isEn ? 'Up to 3 tags' : '最多选择 3 个标签');
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/post/new' } }} />;
  }

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const files = selectedFiles.slice(0, 3 - imageFiles.length);
    setImageNotice(selectedFiles.length > files.length
      ? (isEn ? 'Up to 3 images. Only the first available images were added.' : '最多上传 3 张图片，已添加剩余名额内的图片。')
      : '');
    if (files.length === 0) return;
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
    setPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    setImageNotice('');
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPreviewUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (termsStatus?.accepted !== true || loading) return;
    setSubmitError('');
    const showError = (message) => {
      setSubmitError(message);
      Toast.error(message);
    };

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!isAdmin && !trimmedTitle) {
      showError(isEn ? 'Title is required' : '请输入标题');
      return;
    }
    if (!trimmedContent) {
      showError(isEn ? 'Content is required' : '请输入内容');
      return;
    }
    const attribution = isAdmin ? null : buildPostAttribution(contentOrigin, repostSource, customSource);
    if (!isAdmin && !attribution) {
      showError(isEn ? 'Enter a plain-text source of 1–100 characters' : '请输入 1–100 字符的纯文本来源');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: isAdmin ? undefined : trimmedTitle,
        content: trimmedContent,
        images: imageFiles.length ? imageFiles : undefined,
      };

      if (isAdmin) {
        payload.type = 'announcement';
      } else {
        Object.assign(payload, attribution);
        if (selectedTagIds.length > 0) payload.tagIds = selectedTagIds;
      }

      const created = await createPost(payload);
      handleExpResponse(created);
      Toast.success(isAdmin ? (isEn ? 'Announcement published' : '公告发布成功') : (isEn ? 'Post published' : '发布成功'));

      const createdTagSlugs = new Set((created?.tags || []).map((tag) => tag?.slug).filter(Boolean));
      const hasFoodSquareTag =
        createdTagSlugs.has(FOOD_SQUARE_TAG_SLUG) ||
        allTags.some((tag) => tag.slug === FOOD_SQUARE_TAG_SLUG && selectedTagIds.includes(tag.id));

      if (!isAdmin && created && created.id) {
        queryClient.setQueryData(QK.postsInfinite(tokenKey, 10, null), (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages) || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          const list = Array.isArray(firstPage.list) ? firstPage.list : [];
          if (list.some((post) => post && post.id === created.id)) return old;
          const nextFirstPage = { ...firstPage, list: [created, ...list] };
          return { ...old, pages: [nextFirstPage, ...old.pages.slice(1)] };
        });

        for (const slug of createdTagSlugs) {
          queryClient.setQueryData(QK.postsInfinite(tokenKey, 10, slug), (old) => {
            if (!old || !old.pages || !Array.isArray(old.pages) || old.pages.length === 0) return old;
            const firstPage = old.pages[0];
            const list = Array.isArray(firstPage.list) ? firstPage.list : [];
            if (list.some((post) => post && post.id === created.id)) return old;
            const nextFirstPage = { ...firstPage, list: [created, ...list] };
            return { ...old, pages: [nextFirstPage, ...old.pages.slice(1)] };
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (hasFoodSquareTag) {
        queryClient.invalidateQueries({ queryKey: ['canteen', 'foodArticles'] });
      }

      const fromFoodSquare = preselectTagSlug === FOOD_SQUARE_TAG_SLUG;
      if (fromFoodSquare) {
        navigate(created?.id ? `/post/${created.id}` : '/eat', { replace: true });
      } else {
        navigate(created?.id ? `/post/${created.id}` : '/', { replace: true });
      }
    } catch (error) {
      if (error?.body?.code === 'TERMS_NOT_ACCEPTED') {
        setTermsStatus({
          version: error.body.data?.version || termsStatus?.version || '',
          accepted: false,
        });
        setTermsError(isEn ? 'Please accept the current Terms of Service first.' : '请先接受当前服务条款。');
        return;
      }
      showError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isAdmin ? (isEn ? 'Publish announcement' : '发布公告') : (isEn ? 'Publish post' : '发布帖子');
  const backTo = preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/';

  return (
    <div className="postnew-page">
      <div className="postnew-editor">
        <div className="postnew-editor__topbar">
          <button type="button" className="postnew-back" onClick={() => navigate(backTo)}>
            <ArrowLeft size={16} aria-hidden="true" />{isEn ? 'Back' : '返回'}
          </button>
          <div><h1>{pageTitle}</h1><p className="postnew-intro">{isAdmin ? (isEn ? 'Share an update with the campus.' : '向全校同学发布重要通知。') : (isEn ? 'Share a thought, a question, or a moment on campus.' : '分享校园日常，也聊聊此刻的想法。')}</p></div>
        </div>

        {termsLoading || termsStatus?.accepted !== true ? (
          <TermsAcceptanceGate
            isEn={isEn}
            version={termsStatus?.version}
            loading={termsLoading}
            accepting={termsAccepting}
            error={termsError}
            onAccept={handleAcceptTerms}
            onRetry={loadTermsStatus}
          />
        ) : (
          <form className="postnew-form" onSubmit={handleSubmit} aria-busy={loading} aria-describedby={submitError ? 'postnew-error' : undefined}>
            <div className="postnew-writing">
              {!isAdmin ? (
                <Input
                  id="post-title"
                  className="postnew-title-field"
                  hint={isEn ? `${title.length}/120 characters` : `${title.length}/120 字符`}
                  label={isEn ? 'Title' : '标题'}
                  placeholder={isEn ? 'Give your post a title...' : '给帖子起个标题...'}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                />
              ) : null}

              <Textarea
                id="post-content"
                label={isAdmin ? (isEn ? 'Announcement' : '公告内容') : (isEn ? 'Content' : '内容')}
                placeholder={isAdmin ? (isEn ? 'Write your announcement...' : '写下要通知全站的内容...') : (isEn ? 'Write something...' : '写点什么...')}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={10}
              />

            </div>
            <div className="postnew-tools">
              <div className="postnew-tool">
                <div className="postnew-section-heading"><span className="postnew-label">{isEn ? 'Images' : '添加图片'}</span><span className="postnew-count" aria-live="polite">{previewUrls.length}/3</span></div>
                <p className="postnew-hint">{isEn ? 'Optional · JPG, PNG, WebP or GIF · Up to 3 images' : '选填 · 支持 JPG、PNG、WebP、GIF · 最多 3 张'}</p>
                <div className="postnew-images">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="postnew-image-wrap">
                      <img src={url} alt={isEn ? `Image ${index + 1} preview` : `第 ${index + 1} 张图片预览`} className="postnew-image" />
                      <button
                        type="button"
                        className="postnew-image-remove"
                        onClick={() => removeImage(index)}
                        aria-label={isEn ? `Remove image ${index + 1}` : `移除第 ${index + 1} 张图片`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {previewUrls.length < 3 ? (
                    <label className="postnew-image-add">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        aria-label={isEn ? 'Add images' : '添加图片'}
                        onChange={handleImageChange}
                        className="postnew-file-input"
                      />
                      <span className="postnew-image-add-inner"><ImagePlus size={24} aria-hidden="true" /><span>{isEn ? 'Add images' : '添加图片'}</span></span>
                    </label>
                  ) : null}
                </div>
                {imageNotice ? <p className="postnew-hint" role="status">{imageNotice}</p> : null}
              </div>

              {!isAdmin && allTags.length > 0 ? (
                <div className="postnew-tool">
                  <div className="postnew-section-heading"><span className="postnew-label">{isEn ? 'Topics' : '选择标签'}</span><span className="postnew-count" aria-live="polite">{selectedTagIds.length}/3</span></div>
                  <p className="postnew-hint">{isEn ? 'Optional · Choose up to 3 topics to help others find your post.' : '选填 · 最多选择 3 个，让同学更容易找到你的帖子。'}</p>
                  <div className="postnew-tag-pool">
                    {allTags.map((tag) => {
                      const active = selectedTagIds.includes(tag.id);
                      return (
                        <Tag
                          key={tag.id}
                          as="button"
                          tone="default"
                          variant={active ? 'soft' : 'outline'}
                          active={active}
                          aria-pressed={active}
                          interactive
                          className="postnew-tag-chip-ui"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tagLabel(tag)}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {!isAdmin ? (
              <div className="postnew-declaration">
                <Select
                  id="post-content-origin"
                  label={isEn ? 'Content declaration' : '内容声明'}
                  value={contentOrigin}
                  onChange={(event) => setContentOrigin(event.target.value)}
                  required
                  aria-required="true"
                >
                  <option value="original">{isEn ? 'Original' : '原创'}</option>
                  <option value="repost">{isEn ? 'Repost' : '转载'}</option>
                </Select>
                {contentOrigin === 'repost' ? (
                  <>
                    <Select
                      id="post-repost-source"
                      label={isEn ? 'Source' : '转载来源'}
                      value={repostSource}
                      onChange={(event) => setRepostSource(event.target.value)}
                      required
                      aria-required="true"
                    >
                      {POST_REPOST_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
                      <option value="custom">{isEn ? 'Custom' : '自定义'}</option>
                    </Select>
                    {repostSource === 'custom' ? (
                      <Input
                        id="post-custom-source"
                        label={isEn ? 'Source description' : '来源说明'}
                        hint={isEn ? 'Plain text, 1–100 characters. No link required.' : '1–100 字符纯文本，无需链接。'}
                        value={customSource}
                        onChange={(event) => setCustomSource(event.target.value)}
                        maxLength={POST_REPOST_SOURCE_MAX_LENGTH}
                        required
                        aria-required="true"
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {submitError ? <div id="postnew-error" className="postnew-error" role="alert">{submitError}</div> : null}
            <div className="postnew-submit-row">
              <p className="postnew-hint">{loading ? (isEn ? 'Publishing, please wait…' : '正在发布，请稍候…') : (!isAdmin && !title.trim()) || !content.trim() ? (isEn ? (isAdmin ? 'Add announcement content to publish.' : 'Add a title and content to publish.') : isAdmin ? '填写公告内容后即可发布。' : '填写标题和正文后即可发布。') : (isEn ? 'Ready to publish.' : '准备好了，就发布吧。')}</p>
              <Button
                type="submit"
                iconLeft={<Send size={16} aria-hidden="true" />}
                loading={loading}
                disabled={!isAdmin && !title.trim() ? true : !content.trim()}
              >
                {loading ? (isEn ? 'Publishing…' : '发布中…') : pageTitle}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
