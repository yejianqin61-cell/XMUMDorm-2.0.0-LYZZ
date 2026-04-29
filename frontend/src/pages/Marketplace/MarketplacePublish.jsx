import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { QK } from '../../query/queryKeys';
import { getMarketplaceCategories, createMarketplaceItem, getMarketplaceItemDetail, updateMarketplaceItem } from '../../api/marketplace';
import './Marketplace.css';

const MAX_IMAGES = 4;

function MarketplacePublish() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn, token } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const tokenKey = token ? token.slice(0, 16) : '_guest';

  useEffect(() => {
    if (!isLoggedIn) nav('/login');
  }, [isLoggedIn, nav]);

  const catQuery = useQuery({
    queryKey: QK.marketplaceCategories(),
    queryFn: getMarketplaceCategories,
    staleTime: 60 * 60 * 1000,
    select: (d) => d || [],
  });

  const detailQuery = useQuery({
    enabled: isEdit,
    queryKey: QK.marketplaceItemDetail(id, tokenKey),
    queryFn: () => getMarketplaceItemDetail(id),
    staleTime: 0,
  });

  const categories = useMemo(() => catQuery.data || [], [catQuery.data]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('electronics');
  const [tags, setTags] = useState('');
  const [wechat, setWechat] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);
  const previews = useMemo(() => images.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [images]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  useEffect(() => {
    if (!isEdit) return;
    const d = detailQuery.data;
    if (!d) return;
    if (d?.viewer?.canEdit === false) {
      Toast.error(isZh ? '无权限编辑' : 'No permission');
      nav(`/about/second-hand/item/${id}`);
      return;
    }
    setTitle(d.title || '');
    setDescription(d.description || '');
    setPrice(d.price != null ? String(d.price) : '');
    setCategory(d.category || 'electronics');
    setWechat(d?.contactInfo?.wechat || '');
    setPhone(d?.contactInfo?.phone || '');
    setRemark(d?.contactInfo?.remark || '');
    setTags(Array.isArray(d.tags) ? d.tags.join(',') : '');
  }, [isEdit, detailQuery.data, id, isZh, nav]);

  const createMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('price', price);
      fd.append('category', category);
      if (tags) fd.append('tags', tags);
      if (wechat) fd.append('wechat', wechat);
      if (phone) fd.append('phone', phone);
      if (remark) fd.append('remark', remark);
      images.forEach((f) => fd.append('images', f));
      return await createMarketplaceItem(fd);
    },
    onSuccess: (d) => {
      Toast.success(isZh ? '发布成功' : 'Published');
      nav(`/about/second-hand/item/${d?.id}`);
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '发布失败' : 'Failed')),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      return await updateMarketplaceItem(id, {
        title,
        description,
        price,
        category,
        tags,
        wechat,
        phone,
        remark,
      });
    },
    onSuccess: () => {
      Toast.success(isZh ? '已保存' : 'Saved');
      nav(`/about/second-hand/item/${id}`);
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '保存失败' : 'Failed')),
  });

  const canSubmit = title.trim() && description.trim() && category && price !== '' && (isEdit ? true : true);

  return (
    <div className="mp-page">
      <div className="mp-topbar">
        <Link to={isEdit ? `/about/second-hand/item/${id}` : '/about/second-hand'} className="mp-btn">
          {isZh ? '← 返回' : '← Back'}
        </Link>
        <div className="mp-title">{isEdit ? (isZh ? '编辑商品' : 'Edit item') : (isZh ? '发布商品' : 'Publish')}</div>
        <div />
      </div>

      <div className="mp-form">
        <input className="mp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isZh ? '标题' : 'Title'} />
        <textarea
          className="mp-input"
          style={{ minHeight: 140, resize: 'vertical' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isZh ? '描述（支持换行）' : 'Description (line breaks supported)'}
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="mp-input"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={isZh ? '价格（RM）' : 'Price (RM)'}
          />
          <select className="mp-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {(categories?.length ? categories : []).filter((c) => c.slug !== 'all').map((c) => (
              <option key={c.slug} value={c.slug}>
                {isZh ? c.name_zh : c.name_en}
              </option>
            ))}
          </select>
        </div>

        <input
          className="mp-input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={isZh ? '标签（逗号分隔，可选）' : 'Tags (comma separated, optional)'}
        />

        <div className="mp-contact">
          <div className="mp-contact-title">{isZh ? '联系方式（详情页展示）' : 'Contact (shown on detail)'}</div>
          <input className="mp-input" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder={isZh ? '微信（可选）' : 'WeChat (optional)'} />
          <input className="mp-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={isZh ? '电话（可选）' : 'Phone (optional)'} />
          <input className="mp-input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={isZh ? '备注（可选）' : 'Remark (optional)'} />
        </div>

        {!isEdit ? (
          <>
            <div className="mp-contact">
              <div className="mp-contact-title">{isZh ? '图片（最多 4 张）' : 'Images (max 4)'}</div>
              <div className="mp-help">{isZh ? '建议上传清晰实拍图。' : 'Upload clear photos.'}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="mp-btn"
                  onClick={() => {
                    try {
                      fileInputRef.current?.click?.();
                    } catch {
                      // ignore
                    }
                  }}
                >
                  {isZh ? '选择图片' : 'Choose images'}
                </button>
                <div className="mp-help" aria-label={isZh ? '已选择图片数量' : 'Selected images'}>
                  {isZh ? `已选 ${images.length}/${MAX_IMAGES} 张` : `${images.length}/${MAX_IMAGES} selected`}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const next = files.slice(0, MAX_IMAGES);
                  setImages(next);
                  // allow re-selecting same file(s)
                  try {
                    // eslint-disable-next-line no-param-reassign
                    e.target.value = '';
                  } catch {
                    // ignore
                  }
                }}
              />
              {previews.length ? (
                <div className="mp-preview-grid" style={{ marginTop: 10 }}>
                  {previews.map((p) => (
                    <img key={p.url} src={p.url} alt="preview" />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mp-help">
            {isZh
              ? '编辑模式暂不支持替换图片（一期先保证可编辑文字/价格/分类/联系方式）。'
              : 'Editing images is not supported yet (v1 only edits text/price/category/contact).'}
          </div>
        )}

        <button
          type="button"
          className="mp-btn mp-btn-primary"
          disabled={!canSubmit || createMut.isPending || updateMut.isPending}
          onClick={() => {
            if (isEdit) updateMut.mutate();
            else createMut.mutate();
          }}
        >
          {isEdit ? (isZh ? '保存' : 'Save') : (isZh ? '发布' : 'Publish')}
        </button>
      </div>
    </div>
  );
}

export default MarketplacePublish;

