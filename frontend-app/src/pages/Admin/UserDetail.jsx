import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Ban,
  MicOff,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { getAdminUserDetail, banUser, unbanUser, muteUser, unmuteUser, deleteUser } from '@shared/api/admin';
import { useLanguage } from '../../context/LanguageContext';
import UserActionModal from '../../components/Admin/UserActionModal';

const ROLE_LABELS = { student: '学生', merchant: '商家', admin: '管理员' };
const STATUS_LABELS = { active: '正常', banned: '封禁', deactivated: '已注销' };

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const userId = parseInt(id, 10);

  const [modal, setModal] = useState(null); // { type: 'ban'|'mute' } | null

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => getAdminUserDetail(userId),
    enabled: !!userId,
    staleTime: 10 * 1000,
  });

  const banMutation = useMutation({
    mutationFn: ({ duration, reason }) => banUser(userId, { duration, reason }),
    onSuccess: () => {
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
  });

  const muteMutation = useMutation({
    mutationFn: ({ duration, reason }) => muteUser(userId, { duration, reason }),
    onSuccess: () => {
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: () => unmuteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!window.confirm(isZh ? '确定要注销该账号吗？' : 'Are you sure you want to deactivate this account?')) {
        return Promise.reject(new Error('Cancelled'));
      }
      return deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      navigate('/myzone/admin/users');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-slate-600 text-sm">{error?.message || (isZh ? '加载失败' : 'Failed to load')}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 text-sm mt-2">{isZh ? '返回' : 'Go back'}</button>
      </div>
    );
  }

  if (!user) return null;

  const isBanned = user.status === 'banned';
  const hasActiveMute = user.muted_until && new Date(user.muted_until) > new Date();

  return (
    <div>
      {/* 返回按钮 */}
      <button
        type="button"
        onClick={() => navigate('/myzone/admin/users')}
        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {isZh ? '返回用户列表' : 'Back to users'}
      </button>

      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '用户详情' : 'User Detail'}
      </h1>

      {/* 基本信息卡片 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-[20px] font-bold">
                {(user.nickname || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[18px] font-bold text-slate-900">
                {user.nickname || user.username}
              </h2>
              <span className="text-[13px] text-slate-400">@{user.username}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="inline-block rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-[11px] font-medium">
                {isZh ? (ROLE_LABELS[user.role] || user.role) : user.role}
              </span>
              <span className="inline-block rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[11px] font-medium">
                Lv{user.level || 1} · {user.exp || 0} EXP
              </span>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                user.status === 'banned' ? 'bg-red-50 text-red-600' :
                user.status === 'deactivated' ? 'bg-slate-100 text-slate-500' :
                'bg-green-50 text-green-600'
              }`}>
                {isZh ? (STATUS_LABELS[user.status] || user.status) : user.status}
              </span>
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <InfoItem label={isZh ? 'UID' : 'UID'} value={user.id} />
          <InfoItem label={isZh ? '邮箱' : 'Email'} value={user.email || '-'} />
          <InfoItem label={isZh ? '学院' : 'College'} value={user.college || '-'} />
          <InfoItem label={isZh ? '学号' : 'Student ID'} value={user.student_id || '-'} />
          <InfoItem label={isZh ? '注册时间' : 'Registered'} value={user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'} />
          <InfoItem label={isZh ? '最后登录' : 'Last Login'} value={user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('zh-CN') : '-'} />
        </div>
      </div>

      {/* 数据统计 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-3">
          {isZh ? '数据统计' : 'Statistics'}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label={isZh ? '发帖数' : 'Posts'} value={user.postCount || 0} />
          <StatBox label={isZh ? '评论数' : 'Comments'} value={user.commentCount || 0} />
          <StatBox label={isZh ? '被举报' : 'Reports'} value={user.reportCount || 0} color={user.reportCount > 0 ? 'text-red-600' : undefined} />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-3">
          {isZh ? '管理操作' : 'Admin Actions'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {isBanned ? (
            <ActionBtn
              icon={<CheckCircle className="h-4 w-4" />}
              label={isZh ? '解除封禁' : 'Unban'}
              color="green"
              onClick={() => unbanMutation.mutate()}
              loading={unbanMutation.isPending}
            />
          ) : (
            <ActionBtn
              icon={<Ban className="h-4 w-4" />}
              label={isZh ? '封禁' : 'Ban'}
              color="red"
              onClick={() => setModal({ type: 'ban' })}
              disabled={user.role === 'admin'}
            />
          )}
          {hasActiveMute ? (
            <ActionBtn
              icon={<CheckCircle className="h-4 w-4" />}
              label={isZh ? '解除禁言' : 'Unmute'}
              color="green"
              onClick={() => unmuteMutation.mutate()}
              loading={unmuteMutation.isPending}
            />
          ) : (
            <ActionBtn
              icon={<MicOff className="h-4 w-4" />}
              label={isZh ? '禁言' : 'Mute'}
              color="orange"
              onClick={() => setModal({ type: 'mute' })}
              disabled={user.role === 'admin'}
            />
          )}
          <ActionBtn
            icon={<Trash2 className="h-4 w-4" />}
            label={isZh ? '注销账号' : 'Deactivate'}
            color="gray"
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            disabled={user.role === 'admin'}
          />
        </div>
      </div>

      {/* 封禁/禁言记录 */}
      {user.sanctions?.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="text-[15px] font-semibold text-slate-900 mb-3">
            {isZh ? '制裁记录' : 'Sanction History'}
          </h3>
          <div className="space-y-2">
            {user.sanctions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    s.type === 'ban' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {s.type === 'ban' ? (isZh ? '封禁' : 'Ban') : (isZh ? '禁言' : 'Mute')}
                  </span>
                  <span className="text-slate-600">
                    {s.duration_days ? `${s.duration_days}${isZh ? '天' : 'd'}` : (isZh ? '永久' : 'Permanent')}
                  </span>
                  {s.reason && <span className="text-slate-400">— {s.reason}</span>}
                </div>
                <div className="text-slate-400">
                  {s.starts_at ? new Date(s.starts_at).toLocaleDateString('zh-CN') : '-'}
                  {s.revoked_at ? <span className="text-green-600 ml-2">{isZh ? '已撤销' : 'Revoked'}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作弹窗 */}
      <UserActionModal
        open={!!modal}
        onClose={() => setModal(null)}
        actionType={modal?.type || 'ban'}
        targetName={user.nickname || user.username}
        isZh={isZh}
        onConfirm={(params) => {
          if (modal?.type === 'ban') return banMutation.mutateAsync(params);
          if (modal?.type === 'mute') return muteMutation.mutateAsync(params);
        }}
      />
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="text-center rounded-xl bg-slate-50 py-3 px-2">
      <div className={`text-[22px] font-bold ${color || 'text-slate-900'} tabular-nums`}>{value}</div>
      <div className="text-[12px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function ActionBtn({ icon, label, color = 'gray', onClick, loading = false, disabled = false }) {
  const colorMap = {
    red: 'border-red-200 text-red-600 hover:bg-red-50',
    green: 'border-green-200 text-green-600 hover:bg-green-50',
    orange: 'border-orange-200 text-orange-600 hover:bg-orange-50',
    gray: 'border-slate-200 text-slate-600 hover:bg-slate-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-30 ${colorMap[color] || colorMap.gray}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
