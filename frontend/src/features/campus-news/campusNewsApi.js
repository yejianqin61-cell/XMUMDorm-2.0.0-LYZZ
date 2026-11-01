import { requestRaw } from '@shared/api/request';
import { getUploadUrl } from '@shared/api/config';
import { toRealCampusNewsViewModel } from './campusNewsModel';

async function read(path) {
  const result = await requestRaw(path);
  if (result.__httpStatus !== 200 || result.status !== 0) {
    const error = new Error(result.message || '校园快讯加载失败');
    error.status = result.__httpStatus; throw error;
  }
  return result.data;
}
export const campusNewsApi = {
  context: () => read('/api/campus-news/context'),
  list: filters => read(`/api/campus-news?${new URLSearchParams({ pageSize: 10, ...filters })}`),
  detail: id => read(`/api/campus-news/${encodeURIComponent(id)}`),
  legacy: id => read(`/api/square/campus-posts/${encodeURIComponent(id)}`),
};
export function presentNews(post, colleges) {
  const result = toRealCampusNewsViewModel(post, colleges);
  return { ...result, images: result.images.map(image => ({ ...image, src: getUploadUrl(image.src) })) };
}
