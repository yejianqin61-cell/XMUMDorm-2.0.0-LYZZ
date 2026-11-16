import { get, post } from './request';

/** 服务端是否配置了翻译服务；未配置时前端不显示「翻译」按钮。 */
export function getTranslateConfig() {
  return get('/api/translate/config');
}

/** kind: 'post' | 'comment' | 'review'；target: 'zh' | 'en'。后端按 ID 取原文。 */
export function translateContent({ kind, id, target }) {
  return post('/api/translate', { kind, id, target });
}
