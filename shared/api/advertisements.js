import { get, post, request } from './request';

function toFormData(payload, images = []) {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  (images || []).slice(0, 3).forEach((file) => {
    if (file instanceof File || (typeof Blob !== 'undefined' && file instanceof Blob)) {
      form.append('images', file, file instanceof File ? file.name : undefined);
    }
  });
  return form;
}

export function getAdvertisementsAdmin() {
  return get('/api/advertisements/admin');
}

export function getAdvertisementPreview(postId) {
  return get(`/api/advertisements/admin/${postId}/preview`);
}

export function getAdvertisementPublic(postId) {
  return get(`/api/advertisements/public/${postId}`, { skipAuth: true });
}

export function createAdvertisement(payload, images) {
  return request('/api/advertisements', {
    method: 'POST',
    body: toFormData(payload, images),
  });
}

export function updateAdvertisement(postId, payload, images) {
  return request(`/api/advertisements/${postId}`, {
    method: 'PATCH',
    body: toFormData(payload, images),
  });
}

export function archiveAdvertisement(postId) {
  return post(`/api/advertisements/${postId}/archive`, {});
}
