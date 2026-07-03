import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  searchUsersByEmail,
} from '@shared/api/organizations';
import {
  getTrendingTopics,
  createTrendingTopic,
  updateTrendingTopic,
  deleteTrendingTopic,
  getSquareBanners,
  createSquareBannerForm,
  updateSquareBannerForm,
  deleteSquareBanner,
} from '@shared/api/square';
import { productImageUrl } from '@shared/api/config';
import { QK } from '../query/queryKeys';
import './SquareHome.css';

export default function SquareOrgAdmin() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab') || '';
    if (t === 'trending' || t === 'banners') return t;
    return 'orgs';
  });
  const queryClient = useQueryClient();

  return (
    <div className="square-home-page">
      <div className="square-home-inner">
        <div className="square-campus-tabs" style={{ marginBottom: 12 }}>
          {[
            { key: 'orgs', label: '组织管理' },
            { key: 'trending', label: '热搜管理' },
            { key: 'banners', label: '广场轮播' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className={`square-campus-tab${activeTab === t.key ? ' square-campus-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'orgs' ? <OrgManager /> : activeTab === 'trending' ? <TrendingAdmin /> : <BannersAdmin />}
      </div>
    </div>
  );
}

// ========== 组织管理 ==========
function OrgManager() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.organizationsList(''),
    queryFn: () => getOrganizations(),
    staleTime: 30 * 1000,
  });
  const orgs = Array.isArray(data) ? data : data?.data || [];
  const [showNew, setShowNew] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);

  return (
    <div>
      <div className="square-section-header" style={{ marginBottom: 10 }}>
        <h3 className="square-section-title" style={{ margin: 0 }}>所有组织</h3>
        <button type="button" className="square-section-more" onClick={() => setShowNew(true)}>
          + 新建
        </button>
      </div>

      {isLoading ? (
        <div className="state-loading" style={{ paddingTop: 40 }} />
      ) : orgs.length === 0 ? (
        <div className="state-empty">暂无组织</div>
      ) : (
        <div className="square-campus-list">
          {orgs.map((org) => (
            <div key={org.id} className="square-campus-item" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{org.name}</span>
                <span style={{ fontSize: 11, color: 'var(--post-ios-tertiary-label)', marginLeft: 8 }}>
                  {org.type} {!org.is_active && '（已停用）'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="square-section-more" onClick={() => setSelectedOrg(org)}>
                  成员
                </button>
                <button type="button" className="square-section-more" onClick={() => setEditOrg(org)}>
                  编辑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <OrgForm onClose={() => setShowNew(false)} />}
      {editOrg && <OrgForm org={editOrg} onClose={() => setEditOrg(null)} />}
      {selectedOrg && <MemberManager org={selectedOrg} onClose={() => setSelectedOrg(null)} />}
    </div>
  );
}

// ========== 组织表单 ==========
function OrgForm({ org, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(org?.name || '');
  const [type, setType] = useState(org?.type || 'SchoolDepartment');
  const [description, setDescription] = useState(org?.description || '');

  const mutation = useMutation({
    mutationFn: (body) => (org ? updateOrganization(org.id, body) : createOrganization(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.organizationsList('') });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ name: name.trim(), type, description: description.trim() });
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--post-ios-card)', boxShadow: 'var(--post-ios-shadow-card)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>{org ? '编辑组织' : '新建组织'}</h4>
      <form onSubmit={handleSubmit}>
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="组织名称" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        <select className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="SchoolDepartment">学校部门 SchoolDepartment</option>
          <option value="College">学院 College</option>
          <option value="Official">官方号 Official</option>
        </select>
        <textarea className="canteen-search-input" style={{ width: '100%', minHeight: 60, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} placeholder="简介（可选）" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="canteen-pick-btn pressable" style={{ fontSize: 13, padding: '8px 16px' }} disabled={mutation.isPending}>
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
          <button type="button" className="canteen-pick-reroll pressable" style={{ fontSize: 13 }} onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ========== 成员管理 ==========
function MemberManager({ org, onClose }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.organizationMembers(org.id),
    queryFn: () => getOrganizationMembers(org.id),
    staleTime: 30 * 1000,
  });
  const members = Array.isArray(data) ? data : data?.data || [];
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addOrganizationMember(org.id, { email: email.trim(), title: title.trim(), permission_level: 1 });
      queryClient.invalidateQueries({ queryKey: QK.organizationMembers(org.id) });
      setEmail('');
      setTitle('');
    } catch {}
    setAdding(false);
  };

  const handleRemove = async (mid) => {
    if (!window.confirm('确定移除该成员？')) return;
    try {
      await removeOrganizationMember(org.id, mid);
      queryClient.invalidateQueries({ queryKey: QK.organizationMembers(org.id) });
    } catch {}
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--post-ios-card)', boxShadow: 'var(--post-ios-shadow-card)' }}>
      <div className="square-section-header">
        <h4 style={{ margin: 0, fontSize: 14 }}>{org.name} · 成员 ({members.length})</h4>
        <button type="button" className="square-section-more" onClick={onClose}>关闭</button>
      </div>

      <form onSubmit={handleAdd} style={{ marginTop: 10 }}>
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6 }} placeholder="用户邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="职位（如 主管/Advisor）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" className="canteen-pick-btn pressable" style={{ fontSize: 13, padding: '6px 14px' }} disabled={adding}>
          {adding ? '添加中...' : '添加成员'}
        </button>
      </form>

      <div style={{ marginTop: 10 }}>
        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 30 }} />
        ) : members.length === 0 ? (
          <div className="state-empty" style={{ fontSize: 12 }}>暂无成员</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="square-campus-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.user?.nickname || m.user?.username}</span>
                <span style={{ fontSize: 11, color: 'var(--post-ios-tertiary-label)', marginLeft: 6 }}>{m.user?.email}</span>
                {m.title && <span style={{ fontSize: 11, color: 'var(--post-ios-secondary-label)', marginLeft: 6 }}>· {m.title}</span>}
              </div>
              <button type="button" className="square-section-more" style={{ color: 'var(--post-ios-red)' }} onClick={() => handleRemove(m.id)}>
                移除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========== 热搜管理 ==========
function TrendingAdmin() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.trendingTopics(),
    queryFn: getTrendingTopics,
    staleTime: 30 * 1000,
  });
  const topics = Array.isArray(data) ? data : data?.data || [];
  const [showNew, setShowNew] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteTrendingTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.trendingTopics() }),
  });

  return (
    <div>
      <div className="square-section-header" style={{ marginBottom: 10 }}>
        <h3 className="square-section-title" style={{ margin: 0 }}>热搜话题</h3>
        <button type="button" className="square-section-more" onClick={() => setShowNew(true)}>
          + 新建
        </button>
      </div>

      {isLoading ? (
        <div className="state-loading" style={{ paddingTop: 40 }} />
      ) : topics.length === 0 ? (
        <div className="state-empty">暂无话题</div>
      ) : (
        <div className="square-campus-list">
          {topics.map((t) => (
            <div key={t.id} className="square-campus-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</span>
                <span style={{ fontSize: 11, color: 'var(--post-ios-tertiary-label)', marginLeft: 8 }}>
                  {t.post_count || 0} 讨论
                </span>
              </div>
              <button
                type="button"
                className="square-section-more"
                style={{ color: 'var(--post-ios-red)' }}
                onClick={() => { if (window.confirm('确定删除？')) deleteMutation.mutate(t.id); }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {showNew && <TrendingForm onClose={() => setShowNew(false)} />}
    </div>
  );
}

// ========== 广场轮播管理 ==========
const EMPTY_BANNER = { type: 'content', title: '', subtitle: '', image_url: '', link_type: 'none', link_target: '', sort_order: '0', is_active: true };

function BannersAdmin() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.squareBanners(),
    queryFn: getSquareBanners,
    staleTime: 30 * 1000,
  });
  const banners = Array.isArray(data) ? data : data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: deleteSquareBanner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.squareBanners() }),
  });

  return (
    <div>
      <div className="square-section-header" style={{ marginBottom: 10 }}>
        <h3 className="square-section-title" style={{ margin: 0 }}>广场轮播</h3>
        <button type="button" className="square-section-more" onClick={() => { setEditBanner(null); setShowForm(true); }}>
          + 新建
        </button>
      </div>

      {isLoading ? (
        <div className="state-loading" style={{ paddingTop: 40 }} />
      ) : banners.length === 0 ? (
        <div className="state-empty">暂无轮播</div>
      ) : (
        <div className="square-campus-list">
          {banners.map((b) => (
            <div key={b.id} className="square-campus-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <img src={productImageUrl(b.image_url)} alt="" style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, margin: '0 8px' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{b.title}</span>
                <span style={{ fontSize: 11, color: 'var(--post-ios-tertiary-label)', marginLeft: 8 }}>
                  {b.type === 'ad' ? '广告' : '内容'} · 排序 {b.sort_order || 0}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="square-section-more" onClick={() => { setEditBanner(b); setShowForm(true); }}>编辑</button>
                <button type="button" className="square-section-more" style={{ color: 'var(--post-ios-red)' }}
                  onClick={() => { if (window.confirm('确定删除？')) deleteMutation.mutate(b.id); }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <BannerForm banner={editBanner} onClose={() => { setShowForm(false); setEditBanner(null); }} />}
    </div>
  );
}

function BannerForm({ banner, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const isEdit = !!banner;

  const [form, setForm] = useState({
    type: banner?.type || 'content',
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    image_url: banner?.image_url || '',
    link_type: banner?.link_type || 'none',
    link_target: banner?.link_target || '',
    sort_order: String(banner?.sort_order ?? 0),
    is_active: banner ? !!banner.is_active : true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(banner?.image_url ? productImageUrl(banner.image_url) : '');
  const [saving, setSaving] = useState(false);

  const onPickImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildPayload = () => ({
    type: form.type,
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    link_type: form.link_type,
    link_target: form.link_type === 'none' ? '' : form.link_target.trim(),
    sort_order: String(parseInt(form.sort_order, 10) || 0),
    is_active: form.is_active ? '1' : '0',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!isEdit && !imageFile && !form.image_url.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateSquareBannerForm(banner.id, buildPayload(), imageFile || undefined);
      } else {
        await createSquareBannerForm(buildPayload(), imageFile || undefined);
      }
      queryClient.invalidateQueries({ queryKey: QK.squareBanners() });
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--post-ios-card)', boxShadow: 'var(--post-ios-shadow-card)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>{isEdit ? '编辑轮播' : '新建轮播'}</h4>

      {previewUrl && <img src={previewUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>上传图片（jpg/png/webp/gif）</label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(ev) => onPickImage(ev.target.files?.[0])}
          style={{ marginBottom: 8, fontSize: 13 }}
        />

        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>或填写图片URL</label>
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="https:// 或 /path/to/image.gif"
          value={form.image_url}
          onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value })); setImageFile(null); }}
        />

        <select className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          <option value="content">内容推荐</option>
          <option value="ad">广告</option>
        </select>

        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="标题 *" value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={100} required />

        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="副标题（可选）" value={form.subtitle}
          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} maxLength={200} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select className="canteen-search-input" style={{ flex: 1, boxSizing: 'border-box' }} value={form.link_type}
            onChange={(e) => setForm((f) => ({ ...f, link_type: e.target.value, link_target: '' }))}>
            <option value="none">无跳转</option>
            <option value="url">URL</option>
            <option value="product">商品</option>
            <option value="shop">店铺</option>
            <option value="post">帖子</option>
            <option value="region">区域</option>
          </select>
          <input type="number" className="canteen-search-input" style={{ flex: 1, boxSizing: 'border-box' }} placeholder="排序"
            value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
        </div>

        {form.link_type !== 'none' && (
          <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="跳转目标（ID/URL/code）" value={form.link_target}
            onChange={(e) => setForm((f) => ({ ...f, link_target: e.target.value }))} />
        )}

        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          上线
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="canteen-pick-btn pressable" style={{ fontSize: 13, padding: '8px 16px' }} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button type="button" className="canteen-pick-reroll pressable" style={{ fontSize: 13 }} onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

function TrendingForm({ onClose }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const mutation = useMutation({
    mutationFn: (body) => createTrendingTopic(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.trendingTopics() });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ title: title.trim(), description: description.trim(), sort_order: sortOrder });
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--post-ios-card)', boxShadow: 'var(--post-ios-shadow-card)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>新建热搜话题</h4>
      <form onSubmit={handleSubmit}>
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="话题标题" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        <input className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        <input type="number" className="canteen-search-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} placeholder="排序（越小越前）" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="canteen-pick-btn pressable" style={{ fontSize: 13, padding: '8px 16px' }} disabled={mutation.isPending}>
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
          <button type="button" className="canteen-pick-reroll pressable" style={{ fontSize: 13 }} onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}
