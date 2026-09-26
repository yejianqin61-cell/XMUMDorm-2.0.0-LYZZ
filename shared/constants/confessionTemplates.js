/**
 * 万能墙版式定义（Web 前端 ESM 版本）
 *
 * ⚠️ 与 constants/confessionTemplates.js（CommonJS，供后端校验使用）是**刻意的双胞胎**。
 * 后端是 CommonJS，无法 require() 本文件，因此按仓库既有惯例
 * （见 constants/levelThresholds.js ↔ shared/constants/levelConfig.js）维护两份。
 *
 * 一致性由 __tests__/shared/confessionTemplatesParity.test.js 守护：
 * 两边的 key 集合与 maxLength 必须完全一致，否则测试失败。
 *
 * 参见：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §5
 */

/** 版式白名单。key 即 confessions.template_key 的取值范围 */
export const CONFESSION_TEMPLATES = [
  {
    key: 'bigtype',
    labelZh: '大字卡',
    labelEn: 'Big Type',
    descZh: '短句心意，居中大字',
    descEn: 'Short lines, centered and large',
    maxLength: 60,
  },
  {
    key: 'letter',
    labelZh: '信笺卡',
    labelEn: 'Letter',
    descZh: '长文倾诉，纸感信笺',
    descEn: 'Longer text on letter paper',
    maxLength: 1000,
  },
  {
    key: 'note',
    labelZh: '便签卡',
    labelEn: 'Sticky Note',
    descZh: '寻人寻物，要点分行',
    descEn: 'Lines as items, for finding people or things',
    maxLength: 300,
  },
];

export const DEFAULT_CONFESSION_TEMPLATE = 'bigtype';

/** 版式 key 列表 */
export const CONFESSION_TEMPLATE_KEYS = CONFESSION_TEMPLATES.map((t) => t.key);

/** 未知或缺失时回落到默认版式，避免渲染拿到无法处理的 key */
export function normalizeTemplateKey(key) {
  return CONFESSION_TEMPLATE_KEYS.includes(key) ? key : DEFAULT_CONFESSION_TEMPLATE;
}

/** 取版式定义；未知 key 回落默认版式 */
export function getTemplate(key) {
  return CONFESSION_TEMPLATES.find((t) => t.key === key) || CONFESSION_TEMPLATES[0];
}

/** 该版式的正文字数上限 */
export function getTemplateMaxLength(key) {
  return getTemplate(key).maxLength;
}
