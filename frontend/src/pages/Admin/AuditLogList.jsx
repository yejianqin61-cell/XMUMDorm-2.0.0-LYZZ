import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminAuditLogs } from '../../api/admin';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 30;

const ACTION_LABELS = {
  ADMIN_BAN_USER: '封禁用户', ADMIN_UNBAN_USER: '解除封禁',
  ADMIN_MUTE_USER: '禁言用户', ADMIN_UNMUTE_USER: '解除禁言',
  ADMIN_DELETE_USER: '注销账号',
  ADMIN_HIDE_CONTENT: '隐藏内容', ADMIN_RESTORE_CONTENT: '恢复内容',
  ADMIN_DELETE_CONTENT: '删除内容',
  ADMIN_PROCESS_REPORT: '处理举报',
  ADMIN_CREATE_ANNOUNCEMENT: '发布公告', ADMIN_UPDATE_ANNOUNCEMENT: '编辑公告',
  ADMIN_DELETE_ANNOUNCEMENT: '删除公告',
  ADMIN_VIEW_DASHBOARD: '查看面板',
  ADMIN_CONFIG_UPDATE: '更新配置',
};

export default function AuditLogList() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'auditLogs', page],
    queryFn: () => getAdminAuditLogs({ page, pageSize: PAGE_SIZE }),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });

  const list = data?.list || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '操作日志' : 'Audit Logs'}
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-slate-600 text-sm">{error?.message || (isZh ? '加载失败' : 'Failed to load')}</p>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {isZh ? `共 ${total} 条操作记录` : `Total: ${total} records`}
          </div>

          {/* 移动端：卡片 */}
          <div className="block md:hidden space-y-2">
            {list.map((l) => (
              <div key={l.id} className="rounded-xl bg-white border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-slate-900">
                    {l.username || `ID:${l.user_id}`}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : '-'}
                  </span>
                </div>
                <div className="text-[12px] text-slate-600">
                  {isZh ? (ACTION_LABELS[l.action] || l.action) : l.action}
                </div>
                {l.target_type && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {l.target_type} #{l.target_id}
                  </div>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无日志' : 'No logs'}
              </p>
            )}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden md:block rounded-2xl bg-white border border-slate-100 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '管理员' : 'Admin'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '操作' : 'Action'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '目标' : 'Target'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '时间' : 'Time'}</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {l.username || `ID:${l.user_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">
                        {isZh ? (ACTION_LABELS[l.action] || l.action) : l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.target_type ? `${l.target_type}#${l.target_id}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {l.ip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无日志' : 'No logs'}
              </p>
            )}
          </div>

          {/* 分页 */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] text-slate-600">{page} / {totalPages}</span>
              <button type="button" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
