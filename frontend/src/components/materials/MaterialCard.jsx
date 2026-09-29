/**
 * 资料卡片（列表项）
 */
import { Link } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import { countDownload } from '@shared/api/materials';
import { humanSize, formatDate } from '@shared/utils/materialDisplay';
import { downloadMaterial } from './downloadMaterial';
import { TYPE_META, EXAM_NODE_META, SOURCE_META } from '@shared/constants/materials';

export default function MaterialCard({ item, isZh = true, onDownload }) {
  const meta = TYPE_META[item.type] || { labelZh: '资料', labelEn: 'File', emoji: '📄' };
  const exam = item.examNode ? EXAM_NODE_META[item.examNode] : null;
  const source = item.source ? SOURCE_META[item.source] : null;

  return (
    <div className="mat-glass mat-item">
      <div className="mat-item-icon" aria-hidden>{meta.emoji}</div>

      <div className="mat-item-body">
        <div className="mat-item-title">{item.title}</div>
        <div className="mat-item-meta">
          <span className="mat-pill">{isZh ? meta.labelZh : meta.labelEn}</span>
          {item.lesson != null && (
            <span className="mat-pill mat-pill--ghost">
              {isZh ? `第 ${item.lesson} 课时` : `Lesson ${item.lesson}`}
              {item.lessonTitle ? ` · ${item.lessonTitle}` : ''}
            </span>
          )}
          {exam && <span className="mat-pill mat-pill--ghost">{isZh ? exam.labelZh : exam.labelEn}</span>}
          {source && <span className="mat-pill mat-pill--ghost">{isZh ? source.labelZh : source.labelEn}</span>}
          <span>{humanSize(item.size)}</span>
          {item.updatedAt && <span>{formatDate(item.updatedAt)}</span>}
          {item.uploaderNickname && <span>by {item.uploaderNickname}</span>}
          {item.downloadCount > 0 && (
            <span><Download size={12} style={{ verticalAlign: -2 }} /> {item.downloadCount}</span>
          )}
        </div>
      </div>

      <div className="mat-item-actions">
        <Link className="mat-btn mat-btn--sm" to={`/materials/file?path=${encodeURIComponent(item.path)}`}>
          <Eye size={14} /> {isZh ? '查看' : 'View'}
        </Link>
        <button
          type="button"
          className="mat-btn mat-btn--sm mat-btn--primary"
          onClick={() => {
            // 下载计数是尽力而为：下载本身不依赖它成功
            const count = () => countDownload(item.path).catch(() => {});
            if (onDownload) onDownload(item, count);
            else downloadMaterial(item, { onCount: count });
          }}
        >
          <Download size={14} /> {isZh ? '下载' : 'Download'}
        </button>
      </div>
    </div>
  );
}
