import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Tag from '../components/ui/Tag';
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
  const backTo = preselectTagSlug === FOOD_SQUARE_TAG_SLUG ? '/eat' : '/';

  return (
    <div className="postnew-page">
      <div className="postnew-editor">
        <div className="postnew-editor__topbar">
          <button type="button" className="postnew-back" onClick={() => navigate(backTo)}>
            {isEn ? 'Back' : '返回'}
          </button>
          <h1>{pageTitle}</h1>
        </div>

        <form className="postnew-form" onSubmit={handleSubmit}>
          {!isAdmin ? (
            <Input
              label={isEn ? 'Title' : '标题'}
              placeholder={isEn ? 'Give your post a title...' : '给帖子起个标题...'}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          ) : null}

          <Textarea
            label={isAdmin ? (isEn ? 'Announcement' : '公告内容') : (isEn ? 'Content' : '内容')}
            placeholder={isAdmin ? (isEn ? 'Write your announcement...' : '写下要通知全站的内容...') : (isEn ? 'Write something...' : '写点什么...')}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={10}
          />

          <div className="postnew-tools">
            <div className="postnew-tool">
              <span className="postnew-label">{isEn ? `Images ${previewUrls.length}/3` : `图片 ${previewUrls.length}/3`}</span>
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

            {!isAdmin && allTags.length > 0 ? (
              <div className="postnew-tool">
                <span className="postnew-label">{isEn ? `Tags ${selectedTagIds.length}/3` : `标签 ${selectedTagIds.length}/3`}</span>
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
          </div>

          <div className="postnew-submit-row">
            <Button
              type="submit"
              loading={loading}
              disabled={!isAdmin && !title.trim() ? true : !content.trim()}
            >
              {loading ? (isEn ? 'Publishing…' : '发布中…') : pageTitle}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
