/**
 * PDF 预览器（学习资料）
 *
 * 已实测的关键事实（见 Module10 设计文档 §3.4）：
 *   · CDN 返回 `application/pdf` → iframe 可内联预览；
 *   · raw.githubusercontent 返回 `application/octet-stream` + nosniff → **不能**用于预览（会直接下载）；
 *   · 单文件上限恰为 20 MiB，超过会被拒。
 *
 * 探测方式：iframe 的 error 事件跨域时不可靠，所以用 **onLoad 超时探测**。
 *
 * ⚠️ 与仓库地址有关的两条约束（2026-09-29 用户裁定「所有地方不允许跳转到源仓库的地址」）：
 *   1. **不提供「在新窗口打开」**：那会把带真实地址的 URL 显式暴露到地址栏与历史记录里。
 *   2. **不使用 pdf.js 在线查看器**：它需要把文件地址作为 `?file=` 查询参数交给第三方域名，
 *      等于把地址送到别人的日志里。预览失败时降级为「仅下载」即可。
 *   下载一律走父组件传入的 `onDownload`（blob 保存，既保住原始文件名，也不在地址栏留下地址）。
 */

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

const LOAD_TIMEOUT_MS = 8000;

export default function PdfViewer({ url, title = 'PDF', fileName, onDownload }) {
  const [fallback, setFallback] = useState(false); // true = 放弃在线预览，仅下载
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  const [previousUrl, setPreviousUrl] = useState(url);
  if (previousUrl !== url) {
    setPreviousUrl(url);
    setLoaded(false);
    setTimedOut(false);
  }

  useEffect(() => {
    if (fallback) return undefined;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [fallback, url]);

  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setLoaded(true);
  };

  const downloadBtn = (primary) => (
    <button
      type="button"
      className={primary ? 'mat-btn mat-btn--primary' : 'mat-btn mat-btn--sm'}
      onClick={() => onDownload && onDownload()}
    >
      <Download size={primary ? 15 : 14} /> 下载{primary && fileName ? ` ${fileName}` : ''}
    </button>
  );

  return (
    <div className="mat-viewer">
      <div className="mat-toolbar" style={{ marginTop: 0, marginBottom: 10 }}>
        <span className="mat-pill mat-pill--ghost">PDF</span>
        {!fallback && <span className="mat-muted">在线预览</span>}
        {fallback && <span className="mat-muted">在线预览不可用，请下载查看</span>}

        <span style={{ flex: 1 }} />

        {!fallback && (
          <button type="button" className="mat-btn mat-btn--sm" onClick={() => setFallback(true)}>
            预览异常？改为仅下载
          </button>
        )}
        {downloadBtn(false)}
      </div>

      {timedOut && !fallback && (
        <div className="mat-banner mat-banner--warn">
          预览加载超时（可能被网络拦截，或文件较大）。
          <button
            type="button"
            className="mat-btn mat-btn--sm"
            style={{ marginLeft: 8 }}
            onClick={() => setFallback(true)}
          >
            改为仅下载
          </button>
        </div>
      )}

      {fallback ? (
        <div className="mat-state">
          <p>该文件无法内联预览（可能是网络受限，或文件超过 20 MiB 的预览上限）。</p>
          <p>文件仍然可以正常下载 —— 下载不受预览限制。</p>
          {downloadBtn(true)}
        </div>
      ) : (
        <iframe
          key={url}
          className="mat-viewer-frame"
          src={url}
          title={title}
          onLoad={handleLoad}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}

      {!fallback && !loaded && !timedOut && <div className="mat-state">正在加载预览…</div>}
    </div>
  );
}
