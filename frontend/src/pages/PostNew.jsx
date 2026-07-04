import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Tag from '../components/ui/Tag';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import FormPageLayout from '../components/templates/FormPageLayout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { createPost, getPostTagsList } from '@shared/api/posts';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '@shared/constants/canteen';
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
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const fileInputRef = useRef(null);

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
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((item) => item !== tagId);
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

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 3 - imageFiles.length);
    if (files.length === 0) return;
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
    setPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPreviewUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!isAdmin && !trimmedTitle) {
      Toast.error(isEn ? 'Title is required' : '请输入标题');
      return;
    }
    if (!trimmedContent) {
      Toast.error(isEn ? 'Content is required' : '请输入内容');
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
      } else if (selectedTagIds.length > 0) {
        payload.tagIds = selectedTagIds;
      }

      const created = await createPost(payload);
      handleExpResponse(created);
      Toast.success(isAdmin ? '公告发布成功' : '发布成功');

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
      Toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isAdmin ? '发布公告' : '发布帖子';
  const pageDescription = isAdmin
    ? '把公告内容整理清楚，发布后会在用户登录时弹出提醒，并沉淀到邮箱。'
    : '先把标题、内容、标签和图片整理好，再一次性发布，让内容和分发路径都更清晰。';

  return (
    <div className="postnew-page">
      <FormPageLayout
        className="postnew-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isAdmin ? 'Announcement Desk' : 'Campus Square'}
            title={pageTitle}
            description={pageDescription}
            backTo={preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/'}
            backLabel="Back"
            meta={[
              { key: 'images', label: `${previewUrls.length}/3 Images` },
              { key: 'tags', label: `${selectedTagIds.length}/3 Tags` },
            ]}
          />
        )}
        notice={(
          <Card className="postnew-notice-card" padding="lg">
            <SectionHeader
              title={isAdmin ? '发布说明' : '发帖说明'}
              description={
                isAdmin
                  ? '公告会在用户登录时弹出提示，并同步进入邮箱长期保存。'
                  : preselectTagSlug === FOOD_SQUARE_TAG_SLUG
                    ? '当前会同步发布到吃货广场，请保留相关标签，帖子仍然以匿名方式展示。'
                    : '帖子会以匿名方式展示，收到点赞或评论时，邮箱中会收到提醒。'
              }
            />
          </Card>
        )}
        sections={(
          <>
            <Card className="postnew-form-card" padding="lg">
              <SectionHeader
                title="内容信息"
                description="先填写帖子主体内容，再决定图片和标签。"
              />
              <form className="postnew-form" onSubmit={handleSubmit}>
                {!isAdmin && allTags.length > 0 ? (
                  <div className="postnew-section">
                    <label className="postnew-label">
                      {isEn ? 'Tags (max 3)' : '标签（最多 3 个）'}
                    </label>
                    <p className="postnew-tag-hint">
                      {isEn ? 'Tap to select. Only admins can create tags.' : '点击选择；仅管理员可创建标签。'}
                    </p>
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

                {!isAdmin ? (
                  <div className="postnew-section">
                    <Input
                      label={isEn ? 'Title' : '标题'}
                      placeholder={isEn ? 'Give your post a title...' : '给帖子起个标题...'}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={120}
                      required
                    />
                  </div>
                ) : null}

                <div className="postnew-section">
                  <Textarea
                    label={isAdmin ? '公告内容 Announcement' : '内容 Content'}
                    placeholder={isAdmin ? '写下要通知全站的内容...' : '写点什么... Share something...'}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={8}
                  />
                </div>

                <div className="postnew-section">
                  <label className="postnew-label">图片 Pictures（最多 3 张 / up to 3）</label>
                  <div className="postnew-images">
                    {previewUrls.map((url, index) => (
                      <div key={url} className="postnew-image-wrap">
                        <img src={url} alt="" className="postnew-image" />
                        <button
                          type="button"
                          className="postnew-image-remove"
                          onClick={() => removeImage(index)}
                          aria-label="移除 Remove"
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
                          onChange={handleImageChange}
                          className="postnew-file-input"
                        />
                        <span className="postnew-image-add-inner">+</span>
                      </label>
                    ) : null}
                  </div>
                </div>

                <div className="postnew-inline-submit">
                  <Button
                    type="submit"
                    block
                    loading={loading}
                    disabled={!isAdmin && !title.trim() ? true : !content.trim()}
                  >
                    {loading ? (isAdmin ? '发布公告中...' : '发布中...') : (isAdmin ? '发布公告' : '发布帖子')}
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}
        aside={(
          <>
            <Card className="postnew-aside-card" padding="lg">
              <SectionHeader
                title="发布检查"
                description="提交前快速确认这几个高频项。"
              />
              <div className="postnew-aside-checks">
                <div className="postnew-aside-check">
                  <span>标题</span>
                  <strong>{isAdmin ? '可选' : `${title.trim().length > 0 ? '已填写' : '未填写'}`}</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>内容</span>
                  <strong>{content.trim().length > 0 ? '已填写' : '未填写'}</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>图片</span>
                  <strong>{previewUrls.length}/3</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>标签</span>
                  <strong>{selectedTagIds.length}/3</strong>
                </div>
              </div>
            </Card>
            <Card className="postnew-aside-card" padding="lg">
              <SectionHeader
                title="发布后去向"
                description="提前确认内容发布后的承接页面。"
              />
              <div className="postnew-aside-links">
                <Button as="button" variant="secondary" size="sm" block onClick={() => navigate(preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/')}>
                  返回上一入口
                </Button>
              </div>
            </Card>
          </>
        )}
        actions={(
          <div className="postnew-actionbar">
            <div className="postnew-actionbar__inner">
              <Button
                variant="secondary"
                onClick={() => navigate(preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/')}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={!isAdmin && !title.trim() ? true : !content.trim()}
              >
                {loading ? (isAdmin ? '发布公告中...' : '发布中...') : (isAdmin ? '发布公告' : '立即发布')}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
