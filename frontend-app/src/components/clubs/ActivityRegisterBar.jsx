function formatDeadline(deadline, isZh) {
  if (!deadline) return isZh ? '截止时间待定' : 'Deadline TBD';
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return String(deadline);
  return isZh ? `截止 ${date.toLocaleString()}` : `Deadline ${date.toLocaleString()}`;
}

function ActivityRegisterBar({
  isZh,
  registered,
  count = 0,
  deadline,
  disabled = false,
  loading = false,
  onRegister,
  onCancel,
}) {
  return (
    <div className="activity-register-bar">
      <div className="activity-register-bar__meta">
        <div className="activity-register-bar__count">
          <span className="activity-register-bar__count-value">{count}</span>
          <span className="activity-register-bar__count-label">
            {isZh ? '已报名' : 'Registered'}
          </span>
        </div>
        <div className="activity-register-bar__deadline">
          {formatDeadline(deadline, isZh)}
        </div>
      </div>

      <button
        type="button"
        className={`activity-register-bar__button ${registered ? 'is-secondary' : 'is-primary'} pressable`}
        disabled={disabled || loading}
        onClick={registered ? onCancel : onRegister}
      >
        {loading
          ? (isZh ? '处理中…' : 'Working…')
          : registered
            ? (isZh ? '取消报名' : 'Cancel registration')
            : (isZh ? '立即报名' : 'Register now')}
      </button>
    </div>
  );
}

export default ActivityRegisterBar;
