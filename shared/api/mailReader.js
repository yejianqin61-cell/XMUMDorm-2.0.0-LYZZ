import { get, post } from './request';

/** 邮件识别待办（routes/mailReader.js）：`{ enabled, maxChars }` */
export function getMailReaderConfig() {
  return get('/api/mail-reader/config');
}

/** 识别邮件里的待办：`{ summary, items: [{ title, due_date, due_time, priority, list_type, note }] }`；不写库 */
export function extractTodosFromMail(content, lang = 'zh') {
  return post('/api/mail-reader/extract', { content, lang });
}
