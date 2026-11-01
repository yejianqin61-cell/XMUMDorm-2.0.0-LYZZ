import { useEffect, useRef, useState } from 'react';
import ImagePreview from '../../components/ImagePreview';
import { campusNewsApi } from './api';
import { errorMessage, moveImage, safeImageUrl, validateFiles } from './model.js';

export default function CampusNewsImages({ images, onChange, disabled, onUploading, onFatal }) {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const pending = useRef(null);
  const urls = useRef(new Set());
  useEffect(() => () => { pending.current?.abort(); urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const add = event => {
    const files = [...event.target.files]; event.target.value = '';
    const message = validateFiles(files, images.length); setError(message);
    if (message) return;
    onChange([...images, ...files.map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { localId: crypto.randomUUID(), file, url, alt: file.name };
    })]);
  };
  async function upload() {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    onUploading(true); setError('');
    let current = [...images];
    try {
      for (let index = 0; index < current.length; index++) {
        const image = current[index]; if (!image.file) continue;
        setProgress({ index, percent: 0 });
        const asset = await campusNewsApi.upload(image.file, percent => setProgress({ index, percent }), controller.signal);
        if (controller.signal.aborted) return;
        current = current.map((item, i) => i === index ? asset : item); onChange(current);
        URL.revokeObjectURL(image.url); urls.current.delete(image.url);
      }
    } catch (err) {
      if (!controller.signal.aborted) { setError(errorMessage(err)); if ([401, 403].includes(err.status)) onFatal(err); }
    } finally {
      if (!controller.signal.aborted) { setProgress(null); onUploading(false); }
      pending.current = null;
    }
  }
  return <div className="cn-image-editor">
    <div className="cn-actions"><label className={`cn-file-button ${disabled ? 'cn-disabled' : ''}`}>选择图片<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} onChange={add} /></label>
      <button type="button" disabled={disabled || !images.some(i => i.file)} onClick={upload}>上传所选图片</button><span className="cn-muted">{images.length}/10</span></div>
    <p className="cn-muted">JPEG / PNG / WebP · 每张不超过 8 MiB。移除图片只改变当前内容，不删除历史图片。</p>
    {error && <p className="cn-error" role="alert">{error}</p>}
    {progress && <div role="status">图片 {progress.index + 1} 上传进度：{progress.percent}%{progress.percent === 100 ? '，等待服务器确认…' : ''}<progress max="100" value={progress.percent} /></div>}
    <ol className="cn-thumbnails">{images.map((image, index) => <li key={image.localId || image.id}>
      <button type="button" className="cn-thumbnail" onClick={() => setPreview(index)} aria-label={`预览第 ${index + 1} 张图片`}><img src={safeImageUrl(image.url) || undefined} alt={image.alt || `图片 ${index + 1}`} /></button>
      <span>{index + 1} · {image.file ? '尚未上传' : '已上传'}</span><div className="cn-actions">
        <button type="button" disabled={disabled || index === 0} aria-label={`前移图片 ${index + 1}`} onClick={() => onChange(moveImage(images, index, -1))}>←</button>
        <button type="button" disabled={disabled || index === images.length - 1} aria-label={`后移图片 ${index + 1}`} onClick={() => onChange(moveImage(images, index, 1))}>→</button>
        <button type="button" disabled={disabled} onClick={() => { if (image.file) { URL.revokeObjectURL(image.url); urls.current.delete(image.url); } onChange(images.filter((_, i) => i !== index)); }}>移除</button>
      </div></li>)}</ol>
    {preview !== null && <ImagePreview urls={images.map(i => safeImageUrl(i.url))} initialIndex={preview} onClose={() => setPreview(null)} />}
  </div>;
}
