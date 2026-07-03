import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, ArrowLeft, UserPlus, PlusCircle, Save, UserRoundPlus, Pencil, MessageSquarePlus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { QK } from '../../query/queryKeys';
import {
  addClubMember,
  deleteClubActivity,
  deleteClubPost,
  getClubProfile,
  searchUsersByEmailForClub,
  toggleClubFollow,
  updateClub,
  updateClubActivityStatus,
} from '@shared/api/clubs';
import { queryClient } from '../../query/queryClient';
import { getApiErrorMessage } from '../../utils/apiError';
import './Clubs.css';

function ClubProfile() {
  const { id } = useParams();
  const clubId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();
  const { user } = useAuth();

  // NOTE: keep all hooks before any early return to avoid React hooks order issues.
  /** 管理区折叠：null | 'edit' | 'members' */
  const [adminPanel, setAdminPanel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('music');
  const [editDesc, setEditDesc] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editSignup, setEditSignup] = useState('');
  const [editIg, setEditIg] = useState('');
  const [editXhs, setEditXhs] = useState('');
  const [editLogo, setEditLogo] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [userQuery, setUserQuery] = useState('');

  const q = useQuery({
    queryKey: QK.clubProfile(clubId),
    queryFn: async () => await getClubProfile(clubId),
    enabled: Number.isFinite(clubId) && clubId > 0,
  });

  const data = q.data;
  const basic = data?.basicInfo;
  const join = data?.joinInfo;
  const following = !!basic?.viewer?.following;
  const canManage = !!basic?.viewer?.canManage || user?.role === 'admin';
  const isMember = !!basic?.viewer?.isMember || !!canManage;

  const followMut = useMutation({
    mutationFn: async () => await toggleClubFollow(clubId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QK.clubProfile(clubId) });
      const prev = queryClient.getQueryData(QK.clubProfile(clubId));
      const was = !!prev?.basicInfo?.viewer?.following;
      const nextFollowing = !was;
      const delta = nextFollowing ? 1 : -1;
      queryClient.setQueryData(QK.clubProfile(clubId), (old) => {
        if (!old?.basicInfo) return old;
        const f = Number(old.basicInfo.followers || 0);
        return {
          ...old,
          basicInfo: {
            ...old.basicInfo,
            followers: Math.max(0, f + delta),
            viewer: { ...old.basicInfo.viewer, following: nextFollowing },
          },
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QK.clubProfile(clubId), ctx.prev);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
    },
  });

  const saveClubMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (editName) fd.append('name', editName);
      if (editCategory) fd.append('category', editCategory);
      fd.append('description', editDesc || '');
      fd.append('contactText', editContact || '');
      fd.append('signupLink', editSignup || '');
      fd.append('ig', editIg || '');
      fd.append('xhs', editXhs || '');
      if (editLogo) fd.append('logo', editLogo);
      return await updateClub(clubId, fd);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      setAdminPanel(null);
    },
  });

  const usersQ = useQuery({
    queryKey: ['clubs', 'userSearch', clubId, userQuery],
    queryFn: async () => await searchUsersByEmailForClub(clubId, userQuery.trim()),
    enabled: !!canManage && userQuery.trim().length >= 2,
  });

  const addMemberMut = useMutation({
    mutationFn: async () => await addClubMember(clubId, memberEmail.trim(), memberRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      setMemberEmail('');
    },
  });

  function primeEditFieldsFromProfile() {
    setEditName(basic?.name || '');
    setEditCategory(basic?.category || 'music');
    setEditDesc(basic?.description || '');
    setEditContact(join?.contactText || '');
    setEditSignup(join?.signupLink || '');
    setEditIg(join?.ig || '');
    setEditXhs(join?.xhs || '');
    setEditLogo(null);
  }

  function toggleAdminPanel(panel) {
    setAdminPanel((cur) => {
      if (cur === panel) return null;
      if (panel === 'edit') primeEditFieldsFromProfile();
      return panel;
    });
  }

  const statusMut = useMutation({
    mutationFn: async ({ activityId, status }) => await updateClubActivityStatus(activityId, status),
    onMutate: async ({ activityId, status }) => {
      await queryClient.cancelQueries({ queryKey: QK.clubProfile(clubId) });
      const prev = queryClient.getQueryData(QK.clubProfile(clubId));
      queryClient.setQueryData(QK.clubProfile(clubId), (old) => {
        if (!old?.activities) return old;
        return {
          ...old,
          activities: old.activities.map((a) =>
            Number(a.id) === Number(activityId) ? { ...a, status: status || 'ended' } : a
          ),
        };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QK.clubProfile(clubId), ctx.prev);
      Toast.error(getApiErrorMessage(err));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  const deleteActivityMut = useMutation({
    mutationFn: (activityId) => deleteClubActivity(activityId),
    onSuccess: async () => {
      Toast.success(isZh ? '已删除' : 'Deleted');
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err) => Toast.error(getApiErrorMessage(err)),
  });

  const deletePostMut = useMutation({
    mutationFn: (postId) => deleteClubPost(postId),
    onSuccess: async () => {
      Toast.success(isZh ? '已删除' : 'Deleted');
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      await queryClient.invalidateQueries({ queryKey: ['clubs', 'square', 'feed'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err) => Toast.error(getApiErrorMessage(err)),
  });

  const activities = useMemo(() => data?.activities || [], [data]);
  const posts = useMemo(() => data?.posts || [], [data]);
  const members = useMemo(() => data?.members || [], [data]);

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !basic) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  return (
    <div className="club-page">
      <div className="club-profile-top">
        <button type="button" className="club-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="club-profile-title">{basic.name}</div>
        <Link className="club-profile-link" to="/about/club">{isZh ? '列表' : 'List'}</Link>
      </div>

      <div className="club-profile-card">
        <div className="club-profile-head">
          {basic.avatar ? <img src={basic.avatar} alt="" className="club-profile-avatar" /> : <div className="club-profile-avatar club-avatar--ph" />}
          <div className="club-profile-head-main">
            <div className="club-profile-name">{basic.name}</div>
            <div className="club-profile-followers">{Number(basic.followers || 0)} {isZh ? '关注' : 'followers'}</div>
          </div>
          <button
            type="button"
            className={`club-follow-btn pressable ${following ? 'is-on' : ''}`}
            disabled={!token || followMut.isPending}
            title={!token ? (isZh ? '登录后可关注' : 'Login to follow') : (following ? (isZh ? '已关注' : 'Following') : (isZh ? '关注' : 'Follow'))}
            onClick={() => {
              if (!token) return;
              followMut.mutate();
            }}
          >
            <UserPlus size={16} aria-hidden />
            <span>{following ? (isZh ? '已关注' : 'Following') : (isZh ? '关注' : 'Follow')}</span>
          </button>
        </div>
        {basic.category ? <div className="club-chip">{basic.category}</div> : null}
        <div className="club-profile-desc">{basic.description || (isZh ? '（暂无介绍）' : '(No description)')}</div>

        <div className="club-join">
          <div className="club-join-title">{isZh ? '加入方式' : 'Join'}</div>
          {join?.contactText ? <div className="club-join-row">{join.contactText}</div> : null}
          {join?.ig ? <div className="club-join-row">IG: {join.ig}</div> : null}
          {join?.xhs ? <div className="club-join-row">{isZh ? '小红书' : 'XHS'}: {join.xhs}</div> : null}
          {join?.signupLink ? (
            <a className="club-join-link pressable" href={join.signupLink} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> {isZh ? '外链报名' : 'Signup link'}
            </a>
          ) : null}
        </div>

        {isMember ? (
          <div className="club-section club-section--members">
            <div className="club-members-preview">
              <div className="club-members-preview-head">
                <span className="club-members-preview-title">{isZh ? '成员' : 'Members'}</span>
                <span className="club-members-count">{members.length}</span>
              </div>
              {members.length === 0 ? (
                <div className="club-mini-empty">{isZh ? '暂无成员' : 'No members'}</div>
              ) : (
                <>
                  <div className="club-mini-list">
                    {members.slice(0, 3).map((m) => (
                      <div key={m.id} className="club-mini-card">
                        <div className="club-card-row">
                          {m.avatar ? <img src={m.avatar} alt="" className="club-avatar" /> : <div className="club-avatar club-avatar--ph" />}
                          <div className="club-card-main">
                            <div className="club-card-name">{m.nickname || m.username || (isZh ? '成员' : 'Member')}</div>
                            <div className="club-card-desc">{[m.email, m.role].filter(Boolean).join(' · ')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {members.length > 3 ? (
                    <Link to={`/about/club/${clubId}/members`} className="club-members-more pressable">
                      {isZh ? '展示更多' : 'Show all'}
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}

        {canManage ? (
          <div className="club-admin-panel">
            <div className="club-admin-h">{isZh ? '社团管理' : 'Club admin'}</div>
            <div className="club-admin-toolbar" role="toolbar" aria-label={isZh ? '社团管理操作' : 'Club admin actions'}>
              <button
                type="button"
                className={`club-admin-toolbtn pressable ${adminPanel === 'edit' ? 'is-on' : ''}`}
                aria-expanded={adminPanel === 'edit'}
                onClick={() => toggleAdminPanel('edit')}
              >
                <Pencil size={16} aria-hidden />
                <span>{isZh ? '编辑资料' : 'Edit'}</span>
              </button>
              <button
                type="button"
                className={`club-admin-toolbtn pressable ${adminPanel === 'members' ? 'is-on' : ''}`}
                aria-expanded={adminPanel === 'members'}
                onClick={() => toggleAdminPanel('members')}
              >
                <UserRoundPlus size={16} aria-hidden />
                <span>{isZh ? '添加成员' : 'Members'}</span>
              </button>
              <Link
                to={`/about/club/activity/new?clubId=${clubId}`}
                className="club-admin-toolbtn club-admin-toolbtn--link pressable"
              >
                <PlusCircle size={16} aria-hidden />
                <span>{isZh ? '发布活动' : 'Activity'}</span>
              </Link>
              <Link
                to={`/about/club/post/new?clubId=${clubId}`}
                className="club-admin-toolbtn club-admin-toolbtn--link pressable"
              >
                <MessageSquarePlus size={16} aria-hidden />
                <span>{isZh ? '发布日常' : 'Post'}</span>
              </Link>
            </div>

            {adminPanel === 'edit' ? (
              <div className="club-admin-panel-body">
                <div className="club-admin-form">
                  <label className="club-field">
                    <div className="club-label">{isZh ? '名字' : 'Name'}</div>
                    <input className="club-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </label>
                  <label className="club-field">
                    <div className="club-label">{isZh ? '分类' : 'Category'}</div>
                    <select className="club-input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                      <option value="music">music</option>
                      <option value="tech">tech</option>
                      <option value="culture">culture</option>
                      <option value="sport">sport</option>
                      <option value="art">art</option>
                    </select>
                  </label>
                  <label className="club-field">
                    <div className="club-label">{isZh ? '简介' : 'Description'}</div>
                    <textarea className="club-textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </label>
                  <label className="club-field">
                    <div className="club-label">{isZh ? '联系方式' : 'Contact'}</div>
                    <input className="club-input" value={editContact} onChange={(e) => setEditContact(e.target.value)} />
                  </label>
                  <label className="club-field">
                    <div className="club-label">{isZh ? '报名链接' : 'Signup link'}</div>
                    <input className="club-input" value={editSignup} onChange={(e) => setEditSignup(e.target.value)} />
                  </label>
                  <div className="club-grid2">
                    <label className="club-field">
                      <div className="club-label">IG</div>
                      <input className="club-input" value={editIg} onChange={(e) => setEditIg(e.target.value)} />
                    </label>
                    <label className="club-field">
                      <div className="club-label">{isZh ? '小红书' : 'XHS'}</div>
                      <input className="club-input" value={editXhs} onChange={(e) => setEditXhs(e.target.value)} />
                    </label>
                  </div>
                  <label className="club-field">
                    <div className="club-label">{isZh ? 'Logo' : 'Logo'}</div>
                    <input className="club-input" type="file" accept="image/*" onChange={(e) => setEditLogo(e.target.files?.[0] || null)} />
                  </label>

                  <button type="button" className="club-admin-submit pressable" disabled={saveClubMut.isPending} onClick={() => saveClubMut.mutate()}>
                    <Save size={16} aria-hidden />
                    {saveClubMut.isPending ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存修改' : 'Save')}
                  </button>
                </div>
              </div>
            ) : null}

            {adminPanel === 'members' ? (
              <div className="club-admin-panel-body">
                <div className="club-admin-member">
                  <div className="club-admin-subh club-admin-subh--first">{isZh ? '添加成员或管理员' : 'Add member or admin'}</div>
                  <div className="club-admin-member-row">
                    <input
                      className="club-input"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder={isZh ? '输入学生邮箱…' : 'Student email...'}
                    />
                    <select className="club-input club-input--sm" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                      <option value="member">{isZh ? '成员' : 'member'}</option>
                      <option value="admin">{isZh ? '管理员' : 'admin'}</option>
                    </select>
                    <button type="button" className="club-admin-mini pressable" disabled={!memberEmail.trim() || addMemberMut.isPending} onClick={() => addMemberMut.mutate()}>
                      <UserRoundPlus size={16} aria-hidden /> {isZh ? '添加' : 'Add'}
                    </button>
                  </div>

                  <div className="club-admin-subh">{isZh ? '按邮箱搜索用户' : 'Search user by email'}</div>
                  <input className="club-input" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="xxx@xmu.edu.my" />
                  {usersQ.data?.list?.length ? (
                    <div className="club-admin-search-list">
                      {usersQ.data.list.map((u) => (
                        <div key={u.id} className="club-admin-search-item">
                          <div className="club-admin-search-main">
                            <div className="club-admin-search-name">{u.nickname || u.username}</div>
                            <div className="club-admin-search-email">{u.email}</div>
                          </div>
                          <button type="button" className="club-admin-mini pressable" onClick={() => { setMemberEmail(u.email); }}>
                            {isZh ? '填入' : 'Use'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

          </div>
        ) : null}
      </div>

      <section className="club-section">
        <div className="club-section-h">{isZh ? '活动' : 'Activities'}</div>
        {activities.length === 0 ? <div className="club-mini-empty">{isZh ? '暂无活动' : 'No activities'}</div> : null}
        <div className="club-mini-list">
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="club-mini-card">
              <Link to={`/about/club/activity/${a.id}`} className="club-mini-card-main pressable">
                <div className="club-mini-title">{a.title}</div>
                <div className="club-mini-sub">
                  {[a.time ? new Date(a.time).toLocaleString() : '', a.location].filter(Boolean).join(' · ')}
                </div>
              </Link>
              {canManage ? (
                <div className="club-admin-activity-row">
                  {a.tag ? <span className="club-chip">{a.tag}</span> : null}
                  <span className="club-chip">{a.status}</span>
                  <button
                    type="button"
                    className="club-admin-mini pressable"
                    disabled={statusMut.isPending}
                    onClick={() => {
                      const cur = String(a.status || '');
                      const next = cur === 'ended' ? 'ongoing' : 'ended';
                      statusMut.mutate({ activityId: a.id, status: next });
                    }}
                  >
                    {String(a.status || '') === 'ended'
                      ? (isZh ? '恢复进行中' : 'Resume')
                      : (isZh ? '标记结束' : 'Mark ended')}
                  </button>
                  <button
                    type="button"
                    className="club-delete-btn club-delete-btn--compact pressable"
                    disabled={deleteActivityMut.isPending}
                    onClick={() => {
                      if (window.confirm(isZh ? '确定删除该活动？删除后不可恢复。' : 'Delete this activity? This cannot be undone.')) {
                        deleteActivityMut.mutate(a.id);
                      }
                    }}
                  >
                    <Trash2 size={14} aria-hidden />
                    {isZh ? '删除' : 'Delete'}
                  </button>
                </div>
              ) : null}
              {a.signupLink ? (
                <a className="club-mini-link" href={a.signupLink} target="_blank" rel="noreferrer">
                  <MapPin size={14} aria-hidden /> {isZh ? '报名' : 'Sign up'}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="club-section">
        <div className="club-section-h">{isZh ? '日常' : 'Posts'}</div>
        {posts.length === 0 ? <div className="club-mini-empty">{isZh ? '暂无内容' : 'No posts'}</div> : null}
        <div className="club-mini-list">
          {posts.slice(0, 6).map((p) => (
            <div key={p.id} className="club-mini-card club-mini-card--row">
              <Link to={`/about/club/post/${p.id}`} className="club-mini-card-main pressable">
                <div className="club-mini-title">{p.content ? String(p.content).slice(0, 40) : (isZh ? '社团日常' : 'Club post')}</div>
                <div className="club-mini-sub">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
              </Link>
              {canManage ? (
                <button
                  type="button"
                  className="club-delete-btn club-delete-btn--icon-only pressable"
                  title={isZh ? '删除' : 'Delete'}
                  aria-label={isZh ? '删除该日常帖' : 'Delete post'}
                  disabled={deletePostMut.isPending}
                  onClick={() => {
                    if (window.confirm(isZh ? '确定删除该日常帖？删除后不可恢复。' : 'Delete this post? This cannot be undone.')) {
                      deletePostMut.mutate(p.id);
                    }
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ClubProfile;

