import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const BAN_OPTIONS = [
  { value: 1, label: '1 天', labelEn: '1 day' },
  { value: 3, label: '3 天', labelEn: '3 days' },
  { value: 7, label: '7 天', labelEn: '7 days' },
  { value: 30, label: '30 天', labelEn: '30 days' },
  { value: null, label: '永久', labelEn: 'Permanent' },
];

/**
 * @param {'ban'|'mute'} actionType
 */
export default function UserActionModal({ open, onClose, onConfirm, actionType, targetName, isZh }) {
  const [duration, setDuration] = useState(3);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const title = actionType === 'ban'
    ? (isZh ? `封禁用户：${targetName}` : `Ban user: ${targetName}`)
    : (isZh ? `禁言用户：${targetName}` : `Mute user: ${targetName}`);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({ duration, reason: reason.trim() || null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* 时长选择 */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-slate-600 mb-2">
            {isZh ? '时长' : 'Duration'}
          </label>
          <div className="flex flex-wrap gap-2">
            {BAN_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setDuration(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium border transition-colors ${
                  duration === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isZh ? opt.label : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* 原因 */}
        <div className="mb-5">
          <label className="block text-[13px] font-medium text-slate-600 mb-2">
            {isZh ? '原因（可选）' : 'Reason (optional)'}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isZh ? '输入原因...' : 'Enter reason...'}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 按钮 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isZh ? '确认' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
