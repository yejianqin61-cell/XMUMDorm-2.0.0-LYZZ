import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../context/ToastContext';
import { getCanteenStrings } from '../i18n/canteenStrings';
import {
  getCanteenBannersAdmin,
  createCanteenBanner,
  updateCanteenBanner,
  deleteCanteenBanner,
  getRegions,
} from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { productImageUrl } from '../api/config';
import { QK } from '../query/queryKeys';
import './CanteenHome.css';

const EMPTY_FORM = {
  type: 'content',
  title: '',
  subtitle: '',
  image_url: '',
  link_type: 'none',
  link_target: '',
  sort_order: '0',
  is_active: true,
  starts_at: '',
  ends_at: '',
};

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildPayload(form) {
  return {
    type: form.type,
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    link_type: form.link_type,
    link_target: form.link_type === 'none' ? '' : form.link_target.trim(),
    sort_order: String(parseInt(form.sort_order, 10) || 0),
    is_active: form.is_active ? '1' : '0',
    starts_at: form.starts_at || '',
    ends_at: form.ends_at || '',
    ...(form.image_url.trim() && !form.image_url.startsWith('blob:')
      ? { image_url: form.image_url.trim() }
      : {}),
  };
}

export default function CanteenBannerManage() {
  const { isAdmin, isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const bannersQuery = useQuery({
    queryKey: QK.canteenBannersAdmin(),
    queryFn: getCanteenBannersAdmin,
    enabled: isAdmin,
    select: (d) => (Array.isArray(d) ? d : d?.data || []),
  });

  const regionsQuery = useQuery({
    queryKey: QK.canteenRegions(),
    queryFn: getRegions,
    enabled: isAdmin,
    select: (d) => (Array.isArray(d) ? d : d?.data || []),
  });

  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/eat" replace />;
  }

  const banners = bannersQuery.data || [];
  const regions = regionsQuery.data || [];

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      type: b.type || 'content',
      title: b.title || '',
      subtitle: b.subtitle || '',
      image_url: b.image_path || b.image_url || '',
      link_type: b.link_type || 'none',
      link_target: b.link_target || '',
      sort_order: String(b.sort_order ?? 0),
      is_active: !!b.is_active,
      starts_at: toLocalInputValue(b.starts_at),
      ends_at: toLocalInputValue(b.ends_at),
    });
    setImageFile(null);
    setPreviewUrl(productImageUrl(b.image_url));
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickImage = (file) => {
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QK.canteenBanners() });
    queryClient.invalidateQueries({ queryKey: QK.canteenBannersAdmin() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      Toast.error(t.bannerTitleRequired);
      return;
    }
    if (!editingId && !imageFile && !form.image_url.trim()) {
      Toast.error(t.bannerImageRequired);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await updateCanteenBanner(editingId, payload, imageFile || undefined);
        Toast.success(t.bannerSaved);
      } else {
        await createCanteenBanner(payload, imageFile || undefined);
        Toast.success(t.bannerCreated);
      }
      resetForm();
      invalidate();
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.bannerDeleteConfirm)) return;
    try {
      await deleteCanteenBanner(id);
      Toast.success(t.bannerDeleted);
      if (editingId === id) resetForm();
      invalidate();
    } catch (err) {
      Toast.error(getApiErrorMessage(err));
    }
  };

  const linkNeedsTarget = form.link_type !== 'none';

  return (
    <div className="canteen-home-page canteen-banner-admin-page">
      <div className="canteen-home-inner">
        <p className="canteen-banner-admin-hint">{t.bannerAdminHint}</p>

        {bannersQuery.isLoading && <p className="canteen-muted">{t.loading}</p>}
        {bannersQuery.isError && (
          <p className="canteen-error">{t.loadFailed}</p>
        )}

        <ul className="canteen-banner-admin-list">
          {banners.map((b) => (
            <li key={b.id} className="canteen-banner-admin-item">
              <img
                src={productImageUrl(b.image_url)}
                alt=""
                className="canteen-banner-admin-thumb"
              />
              <div className="canteen-banner-admin-item-body">
                <div className="canteen-banner-admin-item-title">
                  {b.title}
                  {!b.is_active && (
                    <span className="canteen-banner-admin-inactive">{t.bannerInactive}</span>
                  )}
                </div>
                {b.subtitle && (
                  <div className="canteen-banner-admin-item-sub">{b.subtitle}</div>
                )}
                <div className="canteen-banner-admin-item-meta">
                  #{b.sort_order} · {b.link_type}
                  {b.link_target ? ` → ${b.link_target}` : ''}
                </div>
              </div>
              <div className="canteen-banner-admin-item-actions">
                <button type="button" onClick={() => startEdit(b)}>
                  {t.bannerEdit}
                </button>
                <button type="button" className="canteen-banner-admin-del" onClick={() => handleDelete(b.id)}>
                  {t.bannerDelete}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="canteen-banner-admin-add"
          onClick={resetForm}
        >
          {t.bannerAdd}
        </button>

        <form className="canteen-banner-admin-form" onSubmit={handleSubmit}>
          <h2 className="canteen-banner-admin-form-title">
            {editingId ? t.bannerEditTitle : t.bannerAddTitle}
          </h2>

          {previewUrl && (
            <img src={previewUrl} alt="" className="canteen-banner-admin-preview" />
          )}

          <label className="canteen-banner-admin-label">
            {t.bannerFieldImage}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(ev) => onPickImage(ev.target.files?.[0])}
            />
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldImageUrl}
            <input
              type="text"
              value={form.image_url}
              onChange={(ev) => setForm((f) => ({ ...f, image_url: ev.target.value }))}
              placeholder="/products/default.png"
            />
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldType}
            <select
              value={form.type}
              onChange={(ev) => setForm((f) => ({ ...f, type: ev.target.value }))}
            >
              <option value="content">{t.bannerTypeContent}</option>
              <option value="ad">{t.bannerTypeAd}</option>
            </select>
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldTitle}
            <input
              type="text"
              required
              maxLength={100}
              value={form.title}
              onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
            />
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldSubtitle}
            <input
              type="text"
              maxLength={200}
              value={form.subtitle}
              onChange={(ev) => setForm((f) => ({ ...f, subtitle: ev.target.value }))}
            />
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldLinkType}
            <select
              value={form.link_type}
              onChange={(ev) => setForm((f) => ({ ...f, link_type: ev.target.value, link_target: '' }))}
            >
              <option value="none">{t.bannerLinkNone}</option>
              <option value="product">{t.bannerLinkProduct}</option>
              <option value="shop">{t.bannerLinkShop}</option>
              <option value="post">{t.bannerLinkPost}</option>
              <option value="region">{t.bannerLinkRegion}</option>
              <option value="url">{t.bannerLinkUrl}</option>
            </select>
          </label>

          {linkNeedsTarget && form.link_type === 'region' && (
            <label className="canteen-banner-admin-label">
              {t.bannerFieldLinkTarget}
              <select
                value={form.link_target}
                onChange={(ev) => setForm((f) => ({ ...f, link_target: ev.target.value }))}
              >
                <option value="">—</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} {r.name ? `· ${r.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {linkNeedsTarget && form.link_type !== 'region' && (
            <label className="canteen-banner-admin-label">
              {t.bannerFieldLinkTarget}
              <input
                type="text"
                value={form.link_target}
                onChange={(ev) => setForm((f) => ({ ...f, link_target: ev.target.value }))}
                placeholder={
                  form.link_type === 'url'
                    ? 'https://'
                    : (isZh ? 'ID 或代码' : 'ID or code')
                }
              />
            </label>
          )}

          <label className="canteen-banner-admin-label">
            {t.bannerFieldSort}
            <input
              type="number"
              value={form.sort_order}
              onChange={(ev) => setForm((f) => ({ ...f, sort_order: ev.target.value }))}
            />
          </label>

          <label className="canteen-banner-admin-label canteen-banner-admin-check">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(ev) => setForm((f) => ({ ...f, is_active: ev.target.checked }))}
            />
            {t.bannerFieldActive}
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldStarts}
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(ev) => setForm((f) => ({ ...f, starts_at: ev.target.value }))}
            />
          </label>

          <label className="canteen-banner-admin-label">
            {t.bannerFieldEnds}
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(ev) => setForm((f) => ({ ...f, ends_at: ev.target.value }))}
            />
          </label>

          <div className="canteen-banner-admin-actions">
            <button type="submit" className="canteen-banner-admin-save" disabled={saving}>
              {saving ? t.loading : t.bannerSave}
            </button>
            {editingId && (
              <button type="button" className="canteen-banner-admin-cancel" onClick={resetForm}>
                {t.bannerCancel}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
