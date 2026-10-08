/**
 * 资料下载
 *
 * ⚠️ 为什么不能只用 `<a download>`：
 *   `download` 属性在**跨域**资源上会被浏览器忽略（jsDelivr 与我们不同源），
 *   结果是「打开 PDF」而不是「保存为原文件名」。
 *
 * 做法：先 fetch 成 blob（jsDelivr 实测返回 Access-Control-Allow-Origin: *，
 * 所以跨域可取），再用 object URL + `download` 保存 —— 这样文件名一定是原始名。
 *
 * 服务器不参与：字节全部来自 CDN（设计目标「读路径零服务器带宽」）。
 */

const revokeLater = (url) => setTimeout(() => URL.revokeObjectURL(url), 10000);

export async function downloadMaterial(item, { onCount } = {}) {
  const url = item.downloadUrl || item.cdnUrl;
  const fileName = item.name || 'material';

  if (!url) return false;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    revokeLater(objUrl);

    if (typeof onCount === 'function') onCount();
    return true;
  } catch {
    // 兜底：直接新窗口打开（可能变成「打开」而非下载，但至少不是完全失败）
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return false;
  }
}

/** 从 URL 猜文件名（预签名/直链兜底用） */
export function fileNameFromUrl(url, fallback = 'material') {
  try {
    const p = new URL(url).pathname;
    const last = decodeURIComponent(p.split('/').pop() || '');
    return last || fallback;
  } catch {
    return fallback;
  }
}
