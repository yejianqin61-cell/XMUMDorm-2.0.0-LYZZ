import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag, Loader2, X } from 'lucide-react';
import { submitReport } from '../api/admin';
import { useLanguage } from '../context/LanguageContext';

const REASONS = [
  { value: 'spam', label: '垃圾广告', labelEn: 'Spam' },
  { value: 'fraud', label: '诈骗信息', labelEn: 'Fraud' },
  { value: 'abuse', label: '辱骂攻击', labelEn: 'Abuse' },
  { value: 'nsfw', label: '色情内容', labelEn: 'NSFW' },
  { value: 'trolling', label: '恶意引战', labelEn: 'Trolling' },
  { value: 'privacy', label: '侵犯隐私', labelEn: 'Privacy' },
  { value: 'illegal_trade', label: '违规交易', labelEn: 'Illegal Trade' },
  { value: 'other', label: '其他', labelEn: 'Other' },
];

/**
 * 通用举报按钮
 * @param {{
 *   target_type: string,
 *   target_id: number|string,
 *   className?: string,
 *   iconOnly?: boolean,
 * }}
 */
export default function ReportButton({ target_type, target_id, className = '', iconOnly = false }) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitReport({ target_type, target_id, reason, detail: detail.trim() || null }),
    onSuccess: () => {
      setOpen(false);
      setReason('');
      setDetail('');
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 ${className}`}
        aria-label={isZh ? '举报' : 'Report'}
      >
        <Flag className="h-4 w-4" />
        {!iconOnly && <span className="text-[13px]">{isZh ? '举报' : 'Report'}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-xl p-5 pb-[calc(16px+var(--safe-bottom))] sm:pb-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">
                {isZh ? '举报内容' : 'Report Content'}
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* 举报原因 */}
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                {isZh ? '举报原因' : 'Reason'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium border transition-colors text-left ${
                      reason === r.value
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isZh ? r.label : r.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 补充说明 */}
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                {isZh ? '补充说明（可选）' : 'Detail (optional)'}
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={isZh ? '补充描述...' : 'Describe more...'}
              />
            </div>

            {/* 错误提示 */}
            {mutation.isError && (
              <p className="text-[13px] text-red-500 mb-3">
                {mutation.error?.message || (isZh ? '提交失败，请重试' : 'Failed to submit')}
              </p>
            )}
            {mutation.isSuccess && (
              <p className="text-[13px] text-green-600 mb-3">
                {isZh ? '举报提交成功，感谢你的反馈' : 'Report submitted. Thank you for your feedback.'}
              </p>
            )}

            {/* 按钮 */}
            <button
              type="button"
              disabled={!reason || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="w-full rounded-xl bg-red-600 py-2.5 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isZh ? '提交举报' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
