import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminReportDetail, processReport } from '../../api/admin';
import { useLanguage } from '../../context/LanguageContext';

const REASON_LABELS = {
  spam: '垃圾广告', fraud: '诈骗信息', abuse: '辱骂攻击',
  nsfw: '色情内容', trolling: '恶意引战', privacy: '侵犯隐私',
  illegal_trade: '违规交易', other: '其他',
};

const ACTIONS = [
  { value: 'dismiss', label: '忽略举报', labelEn: 'Dismiss', color: 'border-slate-200 text-slate-600 hover:bg-slate-50', bgColor: '' },
  { value: 'hide_content', label: '隐藏内容', labelEn: 'Hide Content', color: 'border-amber-200 text-amber-600 hover:bg-amber-50', bgColor: '' },
  { value: 'delete_content', label: '删除内容', labelEn: 'Delete Content', color: 'border-red-200 text-red-600 hover:bg-red-50', bgColor: '' },
  { value: 'mute_user', label: '禁言用户', labelEn: 'Mute User', color: 'border-orange-200 text-orange-600 hover:bg-orange-50', bgColor: '' },
  { value: 'ban_user', label: '封禁用户', labelEn: 'Ban User', color: 'border-red-300 text-red-700 hover:bg-red-50', bgColor: '' },
];

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const reportId = parseInt(id, 10);
  const [note, setNote] = useState('');

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'report', reportId],
    queryFn: () => getAdminReportDetail(reportId),
    enabled: !!reportId,
    staleTime: 10 * 1000,
  });

  const mutation = useMutation({
    mutationFn: ({ action }) => processReport(reportId, { action, note: note.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      navigate('/myzone/admin/reports');
    },
  });

  const handleAction = (action) => {
    if (action === 'ban_user' || action === 'mute_user') {
      if (!window.confirm(isZh ? `确定要${action === 'ban_user' ? '封禁' : '禁言'}该用户吗？` : `Confirm to ${action === 'ban_user' ? 'ban' : 'mute'} this user?`)) {
        return;
      }
    }
    mutation.mutate({ action });
  };

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

  if (!report) return null;

  const isProcessed = report.status === 'resolved' || report.status === 'dismissed';

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/myzone/admin/reports')}
        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {isZh ? '返回举报列表' : 'Back to reports'}
      </button>

      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '举报详情' : 'Report Detail'}
      </h1>

      {/* 举报信息 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-3">
          {isZh ? '举报信息' : 'Report Info'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label={isZh ? '举报ID' : 'Report ID'} value={report.id} />
          <InfoItem label={isZh ? '状态' : 'Status'} value={isZh ? ({ pending: '待处理', processing: '处理中', resolved: '已处理', dismissed: '已驳回' }[report.status]) : report.status} />
          <InfoItem label={isZh ? '举报人' : 'Reporter'} value={report.reporter_name || '-'} />
          <InfoItem label={isZh ? '被举报人' : 'Reported'} value={report.reported_name || '-'} />
          <InfoItem label={isZh ? '举报原因' : 'Reason'} value={isZh ? (REASON_LABELS[report.reason] || report.reason) : report.reason} />
          <InfoItem label={isZh ? '举报时间' : 'Time'} value={report.created_at ? new Date(report.created_at).toLocaleString('zh-CN') : '-'} />
          <InfoItem label={isZh ? '目标类型' : 'Target Type'} value={report.target_type} />
          <InfoItem label={isZh ? '目标ID' : 'Target ID'} value={report.target_id} />
        </div>
        {report.detail && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[12px] text-slate-400 mb-1">{isZh ? '补充说明' : 'Detail'}</div>
            <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{report.detail}</p>
          </div>
        )}
        {report.handler_note && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[12px] text-slate-400 mb-1">{isZh ? '处理备注' : 'Handler Note'}</div>
            <p className="text-[13px] text-slate-700">{report.handler_note}</p>
          </div>
        )}
      </div>

      {/* 处理操作（仅未处理的举报） */}
      {!isProcessed && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
          <h3 className="text-[15px] font-semibold text-slate-900 mb-3">
            {isZh ? '处理举报' : 'Process Report'}
          </h3>

          {/* 备注输入 */}
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-slate-600 mb-2">
              {isZh ? '处理备注（可选）' : 'Note (optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={isZh ? '备注...' : 'Note...'}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => handleAction(a.value)}
                disabled={mutation.isPending}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-30 ${a.color}`}
              >
                {isZh ? a.label : a.labelEn}
              </button>
            ))}
          </div>

          {mutation.isError && (
            <p className="text-[13px] text-red-500 mt-3">
              {mutation.error?.message || (isZh ? '操作失败，请重试' : 'Failed to process')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700 mt-0.5 truncate">{value ?? '-'}</div>
    </div>
  );
}
