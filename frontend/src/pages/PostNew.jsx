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
      Toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isAdmin ? (isEn ? 'Publish announcement' : '发布公告') : (isEn ? 'Publish post' : '发布帖子');
  const pageDescription = isAdmin
    ? (isEn ? 'Publish an announcement to notify users and save it in their mailbox.' : '公告会在用户登录时弹出提醒，并同步保存到邮箱。')
    : (isEn ? 'Add a title, content, tags, and images before publishing.' : '填写标题、内容、标签和图片后发布。');

  return (
    <div className="postnew-page">
      <FormPageLayout
        className="postnew-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isAdmin ? (isEn ? 'Announcements' : '公告') : (isEn ? 'Campus Square' : '校园广场')}
            title={pageTitle}
            description={pageDescription}
            backTo={preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/'}
            backLabel={isEn ? 'Back' : '返回'}
            meta={[
              { key: 'images', label: isEn ? `${previewUrls.length}/3 images` : `${previewUrls.length}/3 张图片` },
              { key: 'tags', label: isEn ? `${selectedTagIds.length}/3 tags` : `${selectedTagIds.length}/3 个标签` },
            ]}
          />
        )}
        notice={(
          <Card className="postnew-notice-card" padding="lg">
            <SectionHeader
              title={isAdmin ? (isEn ? 'Announcement' : '发布说明') : (isEn ? 'Posting' : '发帖说明')}
              description={
                isAdmin
                  ? (isEn ? 'Users will see this announcement when they log in, and it will be saved in their mailbox.' : '公告会在用户登录时弹出提示，并同步保存到邮箱。')
                  : preselectTagSlug === FOOD_SQUARE_TAG_SLUG
                    ? (isEn ? 'This post will also appear in Food Square and remain anonymous.' : '当前会同步发布到吃货广场，帖子仍会匿名展示。')
                    : (isEn ? 'Posts are anonymous. Likes and comments will appear in your mailbox.' : '帖子会匿名展示；收到点赞或评论时，邮箱会收到提醒。')
              }
            />
          </Card>
        )}
        sections={(
          <>
            <Card className="postnew-form-card" padding="lg">
              <SectionHeader
                title={isEn ? 'Content' : '内容信息'}
                description={isEn ? 'Write the post, then add images and tags.' : '填写内容后，再添加图片和标签。'}
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
                    label={isAdmin ? (isEn ? 'Announcement' : '公告内容') : (isEn ? 'Content' : '内容')}
                    placeholder={isAdmin ? (isEn ? 'Write your announcement...' : '写下要通知全站的内容...') : (isEn ? 'Write something...' : '写点什么...')}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={8}
                  />
                </div>

                <div className="postnew-section">
                  <label className="postnew-label">{isEn ? 'Images (up to 3)' : '图片（最多 3 张）'}</label>
                  <div className="postnew-images">
                    {previewUrls.map((url, index) => (
                      <div key={url} className="postnew-image-wrap">
                        <img src={url} alt="" className="postnew-image" />
                        <button
                          type="button"
                          className="postnew-image-remove"
                          onClick={() => removeImage(index)}
                          aria-label={isEn ? 'Remove image' : '移除图片'}
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
                    {loading ? (isAdmin ? (isEn ? 'Publishing announcement…' : '发布公告中…') : (isEn ? 'Publishing…' : '发布中…')) : (isAdmin ? (isEn ? 'Publish announcement' : '发布公告') : (isEn ? 'Publish post' : '发布帖子'))}
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
                title={isEn ? 'Before publishing' : '发布检查'}
                description={isEn ? 'Check these items before submitting.' : '提交前快速确认。'}
              />
              <div className="postnew-aside-checks">
                <div className="postnew-aside-check">
                  <span>{isEn ? 'Title' : '标题'}</span>
                  <strong>{isAdmin ? (isEn ? 'Optional' : '可选') : `${title.trim().length > 0 ? (isEn ? 'Ready' : '已填写') : (isEn ? 'Missing' : '未填写')}`}</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>{isEn ? 'Content' : '内容'}</span>
                  <strong>{content.trim().length > 0 ? (isEn ? 'Ready' : '已填写') : (isEn ? 'Missing' : '未填写')}</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>{isEn ? 'Images' : '图片'}</span>
                  <strong>{previewUrls.length}/3</strong>
                </div>
                <div className="postnew-aside-check">
                  <span>{isEn ? 'Tags' : '标签'}</span>
                  <strong>{selectedTagIds.length}/3</strong>
                </div>
              </div>
            </Card>
            <Card className="postnew-aside-card" padding="lg">
              <SectionHeader
                title={isEn ? 'After publishing' : '发布后去向'}
                description={isEn ? 'Return to the previous page.' : '发布后可返回上一入口。'}
              />
              <div className="postnew-aside-links">
                <Button as="button" variant="secondary" size="sm" block onClick={() => navigate(preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/')}>
                  {isEn ? 'Back to previous page' : '返回上一入口'}
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
                {isEn ? 'Cancel' : '取消'}
              </Button>
              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={!isAdmin && !title.trim() ? true : !content.trim()}
              >
                {loading ? (isAdmin ? (isEn ? 'Publishing announcement…' : '发布公告中…') : (isEn ? 'Publishing…' : '发布中…')) : (isAdmin ? (isEn ? 'Publish announcement' : '发布公告') : (isEn ? 'Publish now' : '立即发布'))}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
