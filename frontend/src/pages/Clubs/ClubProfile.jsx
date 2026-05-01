import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, ArrowLeft, UserPlus, PlusCircle, Save, UserRoundPlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import { addClubMember, createClubActivity, getClubProfile, searchUsersByEmailForClub, toggleClubFollow, updateClub, updateClubActivityStatus } from '../../api/clubs';
import { queryClient } from '../../query/queryClient';
import './Clubs.css';

function ClubProfile() {
  const { id } = useParams();
  const clubId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: QK.clubProfile(clubId),
    queryFn: async () => await getClubProfile(clubId),
    enabled: Number.isFinite(clubId) && clubId > 0,
  });

  const followMut = useMutation({
    mutationFn: async () => await toggleClubFollow(clubId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
    },
  });

  const data = q.data;
  const basic = data?.basicInfo;
  const join = data?.joinInfo;
  const activities = useMemo(() => data?.activities || [], [data]);
  const posts = useMemo(() => data?.posts || [], [data]);
  const members = useMemo(() => data?.members || [], [data]);

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !basic) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed')}</div>;

  const following = !!basic?.viewer?.following;
  const canManage = !!basic?.viewer?.canManage || user?.role === 'admin';

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(basic?.name || '');
  const [editCategory, setEditCategory] = useState(basic?.category || 'music');
  const [editDesc, setEditDesc] = useState(basic?.description || '');
  const [editContact, setEditContact] = useState(join?.contactText || '');
  const [editSignup, setEditSignup] = useState(join?.signupLink || '');
  const [editIg, setEditIg] = useState(join?.ig || '');
  const [editXhs, setEditXhs] = useState(join?.xhs || '');
  const [editLogo, setEditLogo] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [userQuery, setUserQuery] = useState('');

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
      setEditOpen(false);
    },
  });

  const usersQ = useQuery({
    queryKey: ['clubs', 'userSearch', clubId, userQuery],
    queryFn: async () => await searchUsersByEmailForClub(clubId, userQuery.trim()),
    enabled: canManage && userQuery.trim().length >= 2,
  });

  const addMemberMut = useMutation({
    mutationFn: async () => await addClubMember(clubId, memberEmail.trim(), memberRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      setMemberEmail('');
    },
  });

  const [actTitle, setActTitle] = useState('');
  const [actTime, setActTime] = useState('');
  const [actSummary, setActSummary] = useState('');
  const [actLocation, setActLocation] = useState('');
  const actMut = useMutation({
    mutationFn: async () => await createClubActivity(clubId, { title: actTitle, time: actTime, summary: actSummary, location: actLocation }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
      setActTitle(''); setActTime(''); setActSummary(''); setActLocation('');
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ activityId, status }) => await updateClubActivityStatus(activityId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.clubProfile(clubId) });
    },
  });

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

        {canManage ? (
          <div className="club-admin-panel">
            <div className="club-admin-row">
              <div className="club-admin-h">{isZh ? '管理面板' : 'Admin'}</div>
              <button type="button" className="club-admin-toggle pressable" onClick={() => setEditOpen((v) => !v)}>
                <Save size={16} aria-hidden /> {editOpen ? (isZh ? '收起' : 'Collapse') : (isZh ? '编辑社团' : 'Edit')}
              </button>
            </div>

            {editOpen ? (
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
                  {saveClubMut.isPending ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存修改' : 'Save')}
                </button>
              </div>
            ) : null}

            <div className="club-admin-member">
              <div className="club-admin-subh">{isZh ? '添加成员/负责人' : 'Add member/admin'}</div>
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

      <section className="club-section">
        <div className="club-section-h">{isZh ? '活动' : 'Activities'}</div>
        {activities.length === 0 ? <div className="club-mini-empty">{isZh ? '暂无活动' : 'No activities'}</div> : null}
        {canManage ? (
          <div className="club-admin-activity">
            <div className="club-admin-subh">{isZh ? '发布活动' : 'Post activity'}</div>
            <div className="club-admin-form">
              <label className="club-field">
                <div className="club-label">{isZh ? '标题' : 'Title'}</div>
                <input className="club-input" value={actTitle} onChange={(e) => setActTitle(e.target.value)} />
              </label>
              <label className="club-field">
                <div className="club-label">{isZh ? '时间（可填）' : 'Time'}</div>
                <input className="club-input" value={actTime} onChange={(e) => setActTime(e.target.value)} placeholder="2026-05-01 20:30" />
              </label>
              <label className="club-field">
                <div className="club-label">{isZh ? '地点' : 'Location'}</div>
                <input className="club-input" value={actLocation} onChange={(e) => setActLocation(e.target.value)} />
              </label>
              <label className="club-field">
                <div className="club-label">{isZh ? '简介' : 'Summary'}</div>
                <textarea className="club-textarea" rows={2} value={actSummary} onChange={(e) => setActSummary(e.target.value)} />
              </label>
              <button type="button" className="club-admin-submit pressable" disabled={!actTitle.trim() || actMut.isPending} onClick={() => actMut.mutate()}>
                <PlusCircle size={16} aria-hidden /> {actMut.isPending ? (isZh ? '发布中…' : 'Posting…') : (isZh ? '发布活动' : 'Post')}
              </button>
            </div>
          </div>
        ) : null}
        <div className="club-mini-list">
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="club-mini-card">
              <div className="club-mini-title">{a.title}</div>
              <div className="club-mini-sub">
                {[a.time ? new Date(a.time).toLocaleString() : '', a.location].filter(Boolean).join(' · ')}
              </div>
              {canManage ? (
                <div className="club-admin-activity-row">
                  <span className="club-chip">{a.status}</span>
                  <button
                    type="button"
                    className="club-admin-mini pressable"
                    disabled={statusMut.isPending}
                    onClick={() => statusMut.mutate({ activityId: a.id, status: 'ended' })}
                  >
                    {isZh ? '标记结束' : 'Mark ended'}
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
            <div key={p.id} className="club-mini-card">
              <div className="club-mini-title">{p.content ? String(p.content).slice(0, 40) : (isZh ? '社团日常' : 'Club post')}</div>
              <div className="club-mini-sub">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ClubProfile;

