import { requestRaw, getToken } from '@shared/api/request';
import { API_BASE_URL } from '@shared/api/config';
import { getInjectedBaseUrl } from '@shared/api/platform';
import { createCampusNewsApi, NEWS_API, unwrap } from './apiClient.js';

export const campusNewsApi = {
  ...createCampusNewsApi(requestRaw),
  // Uploads create new immutable assets; removing a form thumbnail NEVER deletes an object.
  upload(file, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();
      const cleanup = () => signal.removeEventListener('abort', abort);
      xhr.open('POST', `${getInjectedBaseUrl() ?? API_BASE_URL}${NEWS_API}/images`);
      xhr.timeout = 120000;
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => {
        cleanup();
        try {
          const asset = unwrap({ ...JSON.parse(xhr.responseText), __httpStatus: xhr.status });
          if (!asset?.id || typeof asset.url !== 'string') throw new Error('上传响应无效，未确认图片保存。');
          resolve(asset);
        } catch (error) { error.status = xhr.status; reject(error); }
      };
      xhr.onerror = () => { cleanup(); reject(new Error('图片上传失败，请检查网络后重试。')); };
      xhr.ontimeout = () => { cleanup(); reject(new Error('图片上传超时，未确认上传结果。')); };
      xhr.onabort = () => { cleanup(); reject(new Error('图片上传已取消。')); };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) { cleanup(); reject(new Error('图片上传已取消。')); return; }
      const body = new FormData(); body.append('image', file); xhr.send(body);
    });
  },
};
