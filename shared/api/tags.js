import { get, patch } from './request';

export async function getVisibleTags() {
  return get('/api/posts/tags/visible');
}

export async function setTagVisibility(tagId, visible) {
  return patch(`/api/posts/tags/${tagId}/visible`, { visible });
}
