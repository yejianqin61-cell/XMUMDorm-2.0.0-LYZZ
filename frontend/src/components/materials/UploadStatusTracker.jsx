/**
 * 上传状态机展示
 *
 * 状态必须**真实**来自后端与 GitHub，绝不能收到 200 就显示「上传成功」——
 * 真正的成功是 PR 被合并（status = merged）。
 *
 * uploading → submitted → validating(CI) → merged
 *                                    └→ rejected（附原因）
 *                                    └→ timeout（仍可能后续成功）
 */

import { Check, CircleDashed, ExternalLink, Loader, X } from 'lucide-react';

const ORDER = ['uploading', 'submitted', 'validating', 'merged'];

function stepState(current, key) {
  const ci = ORDER.indexOf(current);
  const ki = ORDER.indexOf(key);
  if (current === 'rejected' || current === 'timeout') {
    // 失败/超时时：已走过的步骤仍标记为完成
    return ki < ORDER.indexOf('validating') ? 'done' : 'fail';
  }
  if (ki < ci) return 'done';
  if (ki === ci) return 'active';
  return 'todo';
}

export default function UploadStatusTracker({ status, rejectReason, prUrl, prNumber, isZh = true }) {
  const steps = [
    { key: 'uploading', labelZh: '正在上传文件', labelEn: 'Uploading file' },
    { key: 'submitted', labelZh: '已提交到资料库', labelEn: 'Submitted to repository' },
    { key: 'validating', labelZh: '等待校验通过', labelEn: 'Waiting for checks' },
    { key: 'merged', labelZh: '已上线', labelEn: 'Published' },
  ];

  return (
    <>
      <div className="mat-steps">
        {steps.map((s) => {
          const st = stepState(status, s.key);
          const cls =
            st === 'done' ? 'mat-step--done' : st === 'active' ? 'mat-step--active' : st === 'fail' ? 'mat-step--fail' : '';
          return (
            <div key={s.key} className={`mat-step ${cls}`}>
              <span className="mat-step-dot">
                {st === 'done' ? <Check size={12} /> : st === 'active' ? <Loader size={12} /> : st === 'fail' ? <X size={12} /> : <CircleDashed size={12} />}
              </span>
              <span>{isZh ? s.labelZh : s.labelEn}</span>
            </div>
          );
        })}
      </div>

      {status === 'rejected' && (
        <div className="mat-banner mat-banner--error">
          <strong>{isZh ? '校验未通过：' : 'Rejected: '}</strong>
          {rejectReason || (isZh ? '资料库校验失败，请检查文件类型与体积' : 'Validation failed')}
        </div>
      )}

      {status === 'timeout' && (
        <div className="mat-banner mat-banner--warn">
          {isZh
            ? '处理时间较长，仍在进行中。可稍后到「我上传的」查看结果 —— 不必重新提交。'
            : 'Still processing. Check “My uploads” later; no need to resubmit.'}
        </div>
      )}

      {status === 'merged' && (
        <div className="mat-banner mat-banner--ok">
          {isZh ? '已上线，其他同学现在可以浏览与下载了。' : 'Published and visible to everyone.'}
        </div>
      )}

      {prUrl && (
        <div className="mat-hint">
          <a href={prUrl} target="_blank" rel="noopener noreferrer">
            #{prNumber} {isZh ? '查看资料库变更记录' : 'View repository change'}
          </a>{' '}
          <ExternalLink size={11} style={{ verticalAlign: -1 }} />
        </div>
      )}
    </>
  );
}
