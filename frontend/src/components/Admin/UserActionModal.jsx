import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Tag from '../ui/Tag';

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

  const title = actionType === 'ban'
    ? (isZh ? `封禁用户：${targetName}` : `Ban user: ${targetName}`)
    : (isZh ? `禁言用户：${targetName}` : `Mute user: ${targetName}`);
  const description = actionType === 'ban'
    ? (isZh ? '请选择封禁时长，并可补充备注原因。' : 'Choose a ban duration and optionally add a reason.')
    : (isZh ? '请选择禁言时长，并可补充备注原因。' : 'Choose a mute duration and optionally add a reason.');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({ duration, reason: reason.trim() || null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      description={description}
      eyebrow={actionType === 'ban' ? 'Moderation' : 'Channel control'}
      size="sm"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={loading} loading={loading}>
            {!loading ? (isZh ? '确认' : 'Confirm') : null}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">
            {isZh ? '时长' : 'Duration'}
          </label>
          <div className="flex flex-wrap gap-2">
            {BAN_OPTIONS.map((opt) => (
              <Tag
                key={String(opt.value)}
                as="button"
                onClick={() => setDuration(opt.value)}
                variant={duration === opt.value ? 'soft' : 'outline'}
                tone={duration === opt.value ? 'square' : 'neutral'}
                active={duration === opt.value}
                interactive
                size="md"
              >
                {isZh ? opt.label : opt.labelEn}
              </Tag>
            ))}
          </div>
        </div>

        <Input
          label={isZh ? '原因（可选）' : 'Reason (optional)'}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isZh ? '输入原因...' : 'Enter reason...'}
        />
      </div>
    </Modal>
  );
}
