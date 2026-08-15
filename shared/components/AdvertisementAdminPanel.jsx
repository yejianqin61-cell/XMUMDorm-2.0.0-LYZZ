import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveAdvertisement,
  createAdvertisement,
  getAdvertisementPreview,
  getAdvertisementsAdmin,
  updateAdvertisement,
} from '../api/advertisements';
import { productImageUrl } from '../api/config';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';

const EMPTY_FORM = {
  title: '',
  content: '',
  sponsor_name: '',
  sponsor_logo: '',
  status: 'draft',
  cta_label: '',
  cta_type: 'none',
  cta_target: '',
};

function copy(isZh) {
  return {
    title: isZh ? '广告内容库' : 'Advertisement library',
    hint: isZh ? '广告只由管理员发布，并且不会出现在普通信息流、树洞或搜索中。' : 'Ads are managed by admins and stay out of regular feeds, TreeHole, and search.',
    add: isZh ? '新建广告' : 'New ad',
    edit: isZh ? '编辑' : 'Edit',
    preview: isZh ? '预览' : 'Preview',
    archive: isZh ? '归档' : 'Archive',
    archived: isZh ? '已归档' : 'Archived',
    active: isZh ? '投放中' : 'Active',
    draft: isZh ? '草稿' : 'Draft',
    formNew: isZh ? '新建广告' : 'New advertisement',
    formEdit: isZh ? '编辑广告' : 'Edit advertisement',
    titleField: isZh ? '标题' : 'Title',
    contentField: isZh ? '正文' : 'Body',
    sponsorField: isZh ? '投放方' : 'Sponsor',
    logoField: isZh ? '投放方 Logo 地址（可选）' : 'Sponsor logo URL (optional)',
    statusField: isZh ? '状态' : 'Status',
    ctaLabelField: isZh ? '按钮文案（可选）' : 'CTA label (optional)',
    ctaTypeField: isZh ? '跳转类型' : 'CTA type',
    ctaTargetField: isZh ? '跳转目标' : 'CTA target',
    imagesField: isZh ? '正文图片（最多 3 张）' : 'Body images (up to 3)',
    save: isZh ? '保存广告' : 'Save ad',
    cancel: isZh ? '取消' : 'Cancel',
    none: isZh ? '不跳转' : 'No link',
    shop: isZh ? '店铺' : 'Shop',
    product: isZh ? '菜品' : 'Dish',
    region: isZh ? '分区' : 'Area',
    internal: isZh ? '站内页面' : 'Internal page',
    https: isZh ? 'HTTPS 外链' : 'HTTPS link',
    empty: isZh ? '还没有广告内容。' : 'No advertisements yet.',
    bannerCount: (n) => (isZh ? `已关联 ${n} 张轮播图` : `${n} carousel slide${n === 1 ? '' : 's'} linked`),
    updated: (value) => (isZh ? `更新于 ${value}` : `Updated ${value}`),
    previewTitle: isZh ? '广告预览' : 'Advertisement preview',
    confirmArchive: isZh ? '确定归档这条广告吗？归档后不会再对用户展示。' : 'Archive this ad? It will no longer be shown to users.',
    loading: isZh ? '加载中…' : 'Loading…',
  };
}

function statusLabel(status, t) {
  return status === 'active' ? t.active : status === 'archived' ? t.archived : t.draft;
}

export default function AdvertisementAdminPanel({ isZh = true, onError, onSuccess }) {
  const t = copy(isZh);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewAd, setPreviewAd] = useState(null);
  const [saving, setSaving] = useState(false);

  const adsQuery = useQuery({
    queryKey: QK.advertisementsAdmin(),
    queryFn: getAdvertisementsAdmin,
  });

  const ads = Array.isArray(adsQuery.data) ? adsQuery.data : [];

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFiles([]);
    setPreviewAd(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (ad) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title || '',
      content: ad.content || '',
      sponsor_name: ad.sponsor_name || '',
      sponsor_logo: ad.sponsor_logo || '',
      status: ad.status || 'draft',
      cta_label: ad.cta_label || '',
      cta_type: ad.cta_type || 'none',
      cta_target: ad.cta_target || '',
    });
    setImageFiles([]);
    setPreviewAd(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePreview = async (id) => {
    try {
      setPreviewAd(await getAdvertisementPreview(id));
    } catch (error) {
      onError?.(getApiErrorMessage(error));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.sponsor_name.trim()) {
      onError?.(isZh ? '标题、正文和投放方不能为空' : 'Title, body, and sponsor are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        sponsor_name: form.sponsor_name.trim(),
        sponsor_logo: form.sponsor_logo.trim(),
        cta_label: form.cta_label.trim(),
        cta_target: form.cta_target.trim(),
      };
      if (editingId) {
        await updateAdvertisement(editingId, payload, imageFiles);
        onSuccess?.(isZh ? '广告已保存' : 'Advertisement saved');
      } else {
        await createAdvertisement(payload, imageFiles);
        onSuccess?.(isZh ? '广告已创建' : 'Advertisement created');
      }
      reset();
      queryClient.invalidateQueries({ queryKey: QK.advertisementsAdmin() });
    } catch (error) {
      onError?.(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm(t.confirmArchive)) return;
    try {
      await archiveAdvertisement(id);
      onSuccess?.(isZh ? '广告已归档' : 'Advertisement archived');
      queryClient.invalidateQueries({ queryKey: QK.advertisementsAdmin() });
      if (editingId === id) reset();
    } catch (error) {
      onError?.(getApiErrorMessage(error));
    }
  };

  return (
    <section className="advertisement-admin-section" aria-labelledby="advertisement-admin-title">
      <div className="advertisement-admin-header">
        <div>
          <h2 id="advertisement-admin-title">{t.title}</h2>
          <p>{t.hint}</p>
        </div>
        <button type="button" className="advertisement-admin-add" onClick={reset}>{t.add}</button>
      </div>

      {adsQuery.isLoading && <p className="canteen-muted">{t.loading}</p>}
      {adsQuery.isError && <p className="canteen-error">{getApiErrorMessage(adsQuery.error)}</p>}
      {!adsQuery.isLoading && !adsQuery.isError && !ads.length && <p className="canteen-muted">{t.empty}</p>}

      <ul className="advertisement-admin-list">
        {ads.map((ad) => (
          <li key={ad.id} className="advertisement-admin-item">
            <div className="advertisement-admin-item-main">
              {ad.images?.[0]?.url && (
                <img src={productImageUrl(ad.images[0].url)} alt="" className="advertisement-admin-thumb" />
              )}
              <div>
                <h3>{ad.title}</h3>
                <p>{ad.sponsor_name} · {statusLabel(ad.status, t)}</p>
                <small>{t.bannerCount(ad.banner_count || 0)}</small>
                {ad.updated_at && <small>{t.updated(new Date(ad.updated_at).toLocaleString(isZh ? 'zh-CN' : 'en-US'))}</small>}
              </div>
            </div>
            <div className="advertisement-admin-actions">
              <button type="button" onClick={() => startEdit(ad)}>{t.edit}</button>
              <button type="button" onClick={() => handlePreview(ad.id)}>{t.preview}</button>
              {ad.status !== 'archived' && <button type="button" onClick={() => handleArchive(ad.id)}>{t.archive}</button>}
            </div>
          </li>
        ))}
      </ul>

      {previewAd && (
        <div className="advertisement-admin-preview">
          <div className="advertisement-admin-preview-head">
            <h3>{t.previewTitle}</h3>
            <button type="button" onClick={() => setPreviewAd(null)}>×</button>
          </div>
          <span className="advertisement-admin-kicker">广告 · {previewAd.sponsor_name}</span>
          <h4>{previewAd.title}</h4>
          <p>{previewAd.content}</p>
          {previewAd.images?.map((image) => (
            <img key={image.url} src={productImageUrl(image.url)} alt="" className="advertisement-admin-preview-image" />
          ))}
          {previewAd.cta_type !== 'none' && <small>{previewAd.cta_label || previewAd.cta_type} → {previewAd.cta_target}</small>}
        </div>
      )}

      <form className="advertisement-admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? t.formEdit : t.formNew}</h3>
        <label>{t.titleField}<input value={form.title} maxLength={120} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></label>
        <label>{t.contentField}<textarea value={form.content} rows={5} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} /></label>
        <label>{t.sponsorField}<input value={form.sponsor_name} maxLength={160} onChange={(e) => setForm((current) => ({ ...current, sponsor_name: e.target.value }))} /></label>
        <label>{t.logoField}<input value={form.sponsor_logo} maxLength={500} onChange={(e) => setForm((current) => ({ ...current, sponsor_logo: e.target.value }))} /></label>
        <label>{t.statusField}
          <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            <option value="draft">{t.draft}</option>
            <option value="active">{t.active}</option>
            <option value="archived">{t.archived}</option>
          </select>
        </label>
        <label>{t.ctaLabelField}<input value={form.cta_label} maxLength={80} onChange={(e) => setForm((current) => ({ ...current, cta_label: e.target.value }))} /></label>
        <label>{t.ctaTypeField}
          <select value={form.cta_type} onChange={(e) => setForm((current) => ({ ...current, cta_type: e.target.value, cta_target: '' }))}>
            <option value="none">{t.none}</option>
            <option value="shop">{t.shop}</option>
            <option value="product">{t.product}</option>
            <option value="region">{t.region}</option>
            <option value="internal">{t.internal}</option>
            <option value="https">{t.https}</option>
          </select>
        </label>
        {form.cta_type !== 'none' && (
          <label>{t.ctaTargetField}<input value={form.cta_target} maxLength={500} placeholder={form.cta_type === 'https' ? 'https://' : 'ID or path'} onChange={(e) => setForm((current) => ({ ...current, cta_target: e.target.value }))} /></label>
        )}
        <label>{t.imagesField}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 3))} /></label>
        <div className="advertisement-admin-form-actions">
          <button type="submit" disabled={saving}>{saving ? t.loading : t.save}</button>
          {editingId && <button type="button" onClick={reset}>{t.cancel}</button>}
        </div>
      </form>
    </section>
  );
}
