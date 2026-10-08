/**
 * 资料详情 —— 按 kind 分发到不同渲染器
 *
 *   markdown → MarkdownViewer（正文优先 CDN，失败走后端兜底）
 *   pdf      → PdfViewer（jsDelivr → pdf.js → 仅下载 三级降级）
 *   image    → 直接展示
 *   其它     → 下载卡片
 *
 * ⚠️ 文件**字节**始终直连 CDN（零服务器带宽）；只有 Markdown 文本在 CDN
 *    不可达时才走后端兜底接口。
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, FileWarning, Loader } from 'lucide-react';
import { listMaterials, fetchMarkdownText } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import MarkdownViewer from '../../components/materials/MarkdownViewer';
import PdfViewer from '../../components/materials/PdfViewer';
import { downloadMaterial } from '../../components/materials/downloadMaterial';
import { humanSize, formatDate, courseLabel } from '@shared/utils/materialDisplay';
import { TYPE_META, EXAM_NODE_META, SOURCE_META, MAX_FILE_BYTES } from '@shared/constants/materials';
import './Materials.css';

/** 20 MiB 是 jsDelivr 的实测上限；超过就明确提示「无法在线预览」而不是让用户干等 */
const PREVIEW_SAFE_BYTES = MAX_FILE_BYTES;

export default function MaterialDetail() {
  const [sp] = useSearchParams();
  const path = sp.get('path') || '';
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  // 列表接口同时提供 baseUrl 与条目元数据（几 KB，且有缓存）
  const { data, isLoading } = useQuery({
    queryKey: QK.materialsList({ pageSize: 300, sort: 'name' }),
    queryFn: () => listMaterials({ pageSize: 300, sort: 'name' }),
    staleTime: 60 * 1000,
  });

  const item = useMemo(
    () => (((data && data.items) || []).find((x) => x.path === path) || null),
    [data, path]
  );

  const dir = useMemo(() => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''), [path]);
  const baseUrl = (data && data.baseUrl) || '';
  const oversized = item && Number(item.size) > PREVIEW_SAFE_BYTES;

  // Markdown 正文
  const [mdText, setMdText] = useState('');
  const [mdError, setMdError] = useState('');
  const [mdLoading, setMdLoading] = useState(false);

  const [previousItem, setPreviousItem] = useState(item);
  if (previousItem !== item) {
    setPreviousItem(item);
    setMdLoading(item?.kind === 'markdown');
    setMdError('');
    setMdText('');
  }

  useEffect(() => {
    if (!item || item.kind !== 'markdown') return undefined;
    let cancelled = false;
    fetchMarkdownText({ cdnUrl: item.cdnUrl, path: item.path })
      .then((t) => { if (!cancelled) setMdText(t); })
      .catch((e) => { if (!cancelled) setMdError(e?.message || '加载失败'); })
      .finally(() => { if (!cancelled) setMdLoading(false); });
    return () => { cancelled = true; };
  }, [item]);

  if (!path) {
    return (
      <div className="mat-page">
        <div className="mat-state">{isZh ? '缺少 path 参数' : 'Missing path'}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mat-page">
        <div className="mat-state"><Loader size={16} /> {isZh ? '加载中…' : 'Loading…'}</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mat-page">
        <div className="mat-wrap">
          <div className="mat-banner mat-banner--error">
            {isZh ? '这份资料不存在，或已被下架。' : 'This material does not exist or was removed.'}
          </div>
          <Link className="mat-btn" to="/materials"><ArrowLeft size={14} /> {isZh ? '返回资料库' : 'Back'}</Link>
        </div>
      </div>
    );
  }

  const meta = TYPE_META[item.type] || { labelZh: '资料', labelEn: 'File', emoji: '📄' };
  const exam = item.examNode ? EXAM_NODE_META[item.examNode] : null;
  const source = item.source ? SOURCE_META[item.source] : null;

  const doDownload = () => {
    downloadMaterial(item, { onCount: () => {} });
  };

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <Link className="mat-btn mat-btn--sm" to={`/materials/course/${item.courseId}`}>
            <ArrowLeft size={14} /> {courseLabel(item, isZh)}
          </Link>

          <div className="mat-hero-row" style={{ marginTop: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="mat-title">
                <span aria-hidden>{meta.emoji}</span> {item.title}
              </h1>
              <div className="mat-item-meta" style={{ marginTop: 8 }}>
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
              </div>
              {item.description && <div className="mat-sub">{item.description}</div>}
              {(item.tags || []).length > 0 && (
                <div className="mat-item-meta" style={{ marginTop: 6 }}>
                  {item.tags.map((t) => (
                    <span key={t} className="mat-pill mat-pill--ghost">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="mat-toolbar" style={{ marginTop: 0 }}>
              {/* ⚠️ 不提供「在新窗口打开」直链：那会把文件真实地址暴露到地址栏与历史记录 */}
              <button type="button" className="mat-btn mat-btn--primary" onClick={doDownload}>
                <Download size={15} /> {isZh ? '下载' : 'Download'}
              </button>
            </div>
          </div>
        </header>

        {oversized && (
          <div className="mat-banner mat-banner--warn">
            {isZh
              ? `该文件 ${humanSize(item.size)} 超过 CDN 的 20MB 预览上限，无法在线预览；下载不受影响。`
              : 'File exceeds the 20MB preview limit; download still works.'}
          </div>
        )}

        {/* ---------------- 按 kind 渲染 ---------------- */}
        {item.kind === 'markdown' && (
          <>
            {mdLoading && <div className="mat-state"><Loader size={16} /> {isZh ? '正在取正文…' : 'Loading…'}</div>}
            {mdError && (
              <div className="mat-banner mat-banner--error">
                <FileWarning size={14} style={{ verticalAlign: -2 }} />{' '}
                {isZh ? `正文加载失败：${mdError}` : `Failed: ${mdError}`}
              </div>
            )}
            {!mdLoading && !mdError && <MarkdownViewer text={mdText} baseUrl={baseUrl} dir={dir} />}
          </>
        )}

        {item.kind === 'pdf' && !oversized && (
          <PdfViewer
            url={item.cdnUrl}
            title={item.title}
            fileName={item.name}
            onDownload={doDownload}
          />
        )}

        {item.kind === 'image' && (
          <div className="mat-glass mat-section" style={{ textAlign: 'center' }}>
            <img src={item.cdnUrl} alt={item.title} style={{ maxWidth: '100%', borderRadius: 10 }} />
          </div>
        )}

        {item.kind !== 'markdown' && item.kind !== 'pdf' && item.kind !== 'image' && (
          <div className="mat-glass mat-section">
            <div className="mat-state">
              <p>
                {isZh
                  ? '该类型不支持在线预览，请下载后查看。'
                  : 'This file type has no in-browser preview; please download it.'}
              </p>
              <button type="button" className="mat-btn mat-btn--primary" onClick={doDownload}>
                <Download size={15} /> {isZh ? `下载 ${item.name}` : `Download ${item.name}`}
              </button>
            </div>
          </div>
        )}

        {item.kind === 'pdf' && oversized && (
          <div className="mat-glass mat-section">
            <div className="mat-state">
              <button type="button" className="mat-btn mat-btn--primary" onClick={doDownload}>
                <Download size={15} /> {isZh ? `下载 ${item.name}` : `Download ${item.name}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
