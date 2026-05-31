import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminReports } from '../../api/admin';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: '', label: '全部', labelEn: 'All' },
  { value: 'pending', label: '待处理', labelEn: 'Pending' },
  { value: 'processing', label: '处理中', labelEn: 'Processing' },
  { value: 'resolved', label: '已处理', labelEn: 'Resolved' },
  { value: 'dismissed', label: '已驳回', labelEn: 'Dismissed' },
];

const REASON_LABELS = {
  spam: '垃圾广告', fraud: '诈骗信息', abuse: '辱骂攻击',
  nsfw: '色情内容', trolling: '恶意引战', privacy: '侵犯隐私',
  illegal_trade: '违规交易', other: '其他',
};

const TARGET_LABELS = {
  post: '树洞帖子', comment: '帖子评论', trending_post: '热搜帖子',
  campus_post: '校园此刻', product_comment: '食堂点评',
  club_activity: '社团活动', club_post: '社团帖子',
  marketplace: '二手商品', errand: '跑腿帖子',
  handbook_article: '一站通文章', handbook_comment: '一站通评论',
  course_review: '课程点评',
};

function ReportStatusBadge({ status, isZh }) {
  const map = {
    pending: { label: isZh ? '待处理' : 'Pending', className: 'bg-amber-50 text-amber-700' },
    processing: { label: isZh ? '处理中' : 'Processing', className: 'bg-blue-50 text-blue-700' },
    resolved: { label: isZh ? '已处理' : 'Resolved', className: 'bg-green-50 text-green-700' },
    dismissed: { label: isZh ? '已驳回' : 'Dismissed', className: 'bg-slate-100 text-slate-500' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

export default function ReportList() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'reports', page, statusFilter],
    queryFn: () => getAdminReports({ page, pageSize: PAGE_SIZE, status: statusFilter || undefined }),
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
        {isZh ? '举报中心' : 'Report Center'}
      </h1>

      {/* 状态 Tab */}
      <div className="flex flex-wrap gap-1 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              statusFilter === t.value
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isZh ? t.label : t.labelEn}
          </button>
        ))}
      </div>

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
            {isZh ? `共 ${total} 条举报` : `Total: ${total} reports`}
          </div>

          {/* 移动端：卡片 */}
          <div className="block md:hidden space-y-3">
            {list.map((r) => (
              <Link
                key={r.id}
                to={`/myzone/admin/reports/${r.id}`}
                className="block rounded-2xl bg-white border border-slate-100 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <ReportStatusBadge status={r.status} isZh={isZh} />
                  <span className="text-[12px] text-slate-400">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
                <div className="text-[13px] text-slate-600">
                  <span>{isZh ? '举报人：' : 'Reporter: '}</span>
                  <span className="font-medium">{r.reporter_name || '-'}</span>
                  <span className="mx-2">→</span>
                  <span>{isZh ? '被举报：' : 'Reported: '}</span>
                  <span className="font-medium">{r.reported_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[12px] text-slate-400">{isZh ? (TARGET_LABELS[r.target_type] || r.target_type) : r.target_type}</span>
                  <span className="inline-block rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">
                    {isZh ? (REASON_LABELS[r.reason] || r.reason) : r.reason}
                  </span>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无举报' : 'No reports'}
              </p>
            )}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden md:block rounded-2xl bg-white border border-slate-100 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '时间' : 'Time'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '举报人' : 'Reporter'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '被举报' : 'Reported'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '模块' : 'Module'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '原因' : 'Reason'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '状态' : 'Status'}</th>
                  <th className="text-center px-4 py-3 font-medium">{isZh ? '操作' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/myzone/admin/reports/${r.id}`)}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.reporter_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reported_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{isZh ? (TARGET_LABELS[r.target_type] || r.target_type) : r.target_type}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {isZh ? (REASON_LABELS[r.reason] || r.reason) : r.reason}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={r.status} isZh={isZh} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {isZh ? '查看' : 'View'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无举报' : 'No reports'}
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
