/**
 * PDF 预览器（学习资料）
 *
 * 已实测的关键事实（见 Module10 设计文档 §3.4）：
 *   · jsDelivr 返回 `application/pdf` → iframe 可内联预览；
 *   · raw.githubusercontent 返回 `application/octet-stream` + nosniff → **不能**用于预览（会直接下载）；
 *   · jsDelivr 单文件上限恰为 20 MiB，超过返回 403。
 *
 * 因此这里实现三级降级：
 *   ① jsDelivr iframe
 *   ② mozilla pdf.js viewer（把 CDN 地址喂给它）
 *   ③ 只给「下载 / 新窗口打开」
 *
 * 探测方式：iframe 的 error 事件跨域时不可靠，所以用 **onLoad 超时探测**。
 */

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';

const PDFJS_VIEWER = 'https://mozilla.github.io/pdf.js/web/viewer.html';
const LOAD_TIMEOUT_MS = 8000;

export default function PdfViewer({ url, rawUrl, title = 'PDF', fileName }) {
  const [stage, setStage] = useState(1); // 1 = jsDelivr, 2 = pdf.js, 3 = 仅下载
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  const src =
    stage === 1
      ? url
      : stage === 2
        ? `${PDFJS_VIEWER}?file=${encodeURIComponent(url)}`
        : null;

  // 每次换源重置状态
  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    if (!src) return undefined;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [src]);

  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setLoaded(true);
  };

  const nextStage = () => {
    setStage((s) => Math.min(3, s + 1));
  };

  return (
    <div className="mat-viewer">
      <div className="mat-toolbar" style={{ marginTop: 0, marginBottom: 10 }}>
        <span className="mat-pill mat-pill--ghost">PDF</span>
        {stage === 1 && <span className="mat-muted">来源：jsDelivr CDN</span>}
        {stage === 2 && <span className="mat-muted">来源：pdf.js 备用查看器</span>}
        {stage === 3 && <span className="mat-muted">在线预览不可用，请下载查看</span>}

        <span style={{ flex: 1 }} />

        {stage < 3 && (
          <button type="button" className="mat-btn mat-btn--sm" onClick={nextStage}>
            <RefreshCw size={14} /> 预览异常？切换备用源
          </button>
        )}
        <a className="mat-btn mat-btn--sm" href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> 新窗口
        </a>
        <a className="mat-btn mat-btn--sm mat-btn--primary" href={rawUrl || url} download={fileName || undefined}>
          <Download size={14} /> 下载
        </a>
      </div>

      {timedOut && stage < 3 && (
        <div className="mat-banner mat-banner--warn">
          预览加载超时（可能被网络拦截或文件较大）。
          <button
            type="button"
            className="mat-btn mat-btn--sm"
            style={{ marginLeft: 8 }}
            onClick={nextStage}
          >
            切换到备用源
          </button>
        </div>
      )}

      {stage === 3 ? (
        <div className="mat-state">
          <p>该文件无法内联预览（可能是网络受限，或文件超过 CDN 的 20 MiB 预览上限）。</p>
          <p>文件仍然可以正常下载 —— 下载走的是直链，不受预览限制。</p>
          <a className="mat-btn mat-btn--primary" href={rawUrl || url} download={fileName || undefined}>
            <Download size={15} /> 下载 {fileName || title}
          </a>
        </div>
      ) : (
        <iframe
          key={src}
          className="mat-viewer-frame"
          src={src}
          title={title}
          onLoad={handleLoad}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}

      {stage !== 3 && !loaded && !timedOut && (
        <div className="mat-state">正在加载预览…</div>
      )}
    </div>
  );
}
