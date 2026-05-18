import { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { useExpFeedback } from '../context/ExpFeedbackContext';
import { createPost, getPostTagsList } from '../api/posts';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import { FOOD_SQUARE_TAG_SLUG } from '../constants/canteen';
import './PostNew.css';

const POST_TAGS_STALE_MS = 15 * 60 * 1000;

/** 发布帖子 / 公告页：需登录；普通用户发帖子，管理员发公告 */
function PostNew() {
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
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const tagLabel = (t) => (isEn ? (t.name_en || t.name_zh) : (t.name_zh || t.name_en));

  useEffect(() => {
    if (!preselectTagSlug || !allTags.length) return;
    const t = allTags.find((x) => x.slug === preselectTagSlug);
    if (!t) return;
    setSelectedTagIds((prev) => {
      if (prev.includes(t.id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, t.id];
    });
  }, [preselectTagSlug, allTags]);

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((x) => x !== tagId);
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - imageFiles.length);
    if (files.length === 0) return;
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
    setPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmed = content.trim();
    if (!isAdmin && !trimmedTitle) {
      Toast.error(isEn ? 'Title is required' : '请输入标题');
      return;
    }
    if (!trimmed) {
      Toast.error('请输入内容');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: isAdmin ? undefined : trimmedTitle,
        content: trimmed,
        images: imageFiles.length ? imageFiles : undefined,
      };
      // 管理员只能发布公告
      if (isAdmin) {
        payload.type = 'announcement';
      } else if (selectedTagIds.length > 0) {
        payload.tagIds = selectedTagIds;
      }
      const created = await createPost(payload);
      handleExpResponse(created);
      Toast.success(isAdmin ? '公告发布成功' : '发布成功');
      const createdTagSlugs = new Set((created?.tags || []).map((t) => t?.slug).filter(Boolean));
      const hasFoodSquareTag =
        createdTagSlugs.has(FOOD_SQUARE_TAG_SLUG) ||
        allTags.some((t) => t.slug === FOOD_SQUARE_TAG_SLUG && selectedTagIds.includes(t.id));
      // 立刻插入到树洞瀑布流缓存，确保发完马上能看到（无需等重新拉取）
      if (!isAdmin && created && created.id) {
        // 精确更新 “全部帖子” 的无限列表缓存（tagSlug === '_all'）
        queryClient.setQueryData(QK.postsInfinite(tokenKey, 10, null), (old) => {
          if (!old || !old.pages || !Array.isArray(old.pages) || old.pages.length === 0) return old;
          const first = old.pages[0];
          const list = Array.isArray(first.list) ? first.list : [];
          if (list.some((p) => p && p.id === created.id)) return old;
          const nextFirst = { ...first, list: [created, ...list] };
          return { ...old, pages: [nextFirst, ...old.pages.slice(1)] };
        });

        // 若当前用户选择了标签页（tagSlug 过滤），也尝试把新帖插入对应缓存（如果帖子包含该标签）
        for (const slug of createdTagSlugs) {
          queryClient.setQueryData(QK.postsInfinite(tokenKey, 10, slug), (old) => {
            if (!old || !old.pages || !Array.isArray(old.pages) || old.pages.length === 0) return old;
            const first = old.pages[0];
            const list = Array.isArray(first.list) ? first.list : [];
            if (list.some((p) => p && p.id === created.id)) return old;
            const nextFirst = { ...first, list: [created, ...list] };
            return { ...old, pages: [nextFirst, ...old.pages.slice(1)] };
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
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="postnew-page">
      <p className="postnew-anonymous-hint">
        {isAdmin
          ? '发布公告后，所有用户在登录时会弹出提示，并在「信箱」中长期保存。Announcements will be shown to all users on login.'
          : preselectTagSlug === FOOD_SQUARE_TAG_SLUG
            ? '发布到「吃货广场」：请保留「吃货广场」标签，帖子会自动出现在食堂吃货广场。发帖为匿名。'
            : '发帖为匿名。他人点赞或评论时，会在「信箱」中收到提醒。Posts are anonymous; you will get like/comment notifications in Mailbox.'}
      </p>
      <form className="postnew-form" onSubmit={handleSubmit}>
        {!isAdmin && allTags.length > 0 && (
          <div className="postnew-section">
            <label className="postnew-label">
              {isEn ? 'Tags (max 3) 标签（最多3个）' : '标签 Tags（最多 3 个 / max 3）'}
            </label>
            <p className="postnew-tag-hint">
              {isEn
                ? 'Tap to select. Only admins can create tags.'
                : '点击选择；仅管理员可创建标签。'}
            </p>
            <div className="postnew-tag-pool">
              {allTags.map((t) => {
                const on = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`postnew-tag-chip ${on ? 'postnew-tag-chip--on' : ''}`}
                    onClick={() => toggleTag(t.id)}
                  >
                    {tagLabel(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!isAdmin && (
          <div className="postnew-section">
            <label className="postnew-label">{isEn ? 'Title 标题（required）' : '标题 Title（必填 / required）'}</label>
            <input
              className="postnew-input"
              placeholder={isEn ? 'Give your post a title…' : '给帖子起个标题…'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
        )}
        <div className="postnew-section">
          <label className="postnew-label">{isAdmin ? '公告内容 Announcement' : '内容 Content'}</label>
          <textarea
            className="postnew-textarea"
            placeholder={isAdmin ? '写下要通知全站的内容…' : '写点什么… Share something…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>
        <div className="postnew-section">
          <label className="postnew-label">图片 Pictures（最多 3 张 / up to 3）</label>
          <div className="postnew-images">
            {previewUrls.map((url, i) => (
              <div key={url} className="postnew-image-wrap">
                <img src={url} alt="" className="postnew-image" />
                <button
                  type="button"
                  className="postnew-image-remove"
                  onClick={() => removeImage(i)}
                  aria-label="移除 Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {previewUrls.length < 3 && (
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
            )}
          </div>
        </div>
        <button
          type="submit"
          className="postnew-submit pressable"
          disabled={loading || (!isAdmin && !title.trim()) || !content.trim()}
        >
          {loading ? (isAdmin ? '发布公告中…' : '发布中…') : (isAdmin ? '发布公告 Announcement' : '发布 Post')}
        </button>
      </form>
    </div>
  );
}

export default PostNew;
