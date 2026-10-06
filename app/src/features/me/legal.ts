/**
 * 法务与关于文本（`M-18`/`M-19`/`M-20`）—— **内置（bundled）**
 *
 * ## 为什么是内置而不是远端
 * 页面清单对 `M-19`/`M-20` 的端点写的是"**无**（静态；**离线可读**）"，而"离线可读"是
 * **商店红线**（隐私政策 URL 必须可无错加载）。所以正文随包内置，⛔ 不依赖网络。
 *
 * ## ⚠️ 当前是**占位正文**（`【提案】`，等所有者给正式文本）
 * 三份文本都是**可辨识的占位**：开头就写明"待替换"，⛔ 不假装是最终法务文本。
 * 替换时只改本文件（⛔ 不动页面），这也是"一改全部改"（宪法 1.4）的落地。
 *
 * ## 为什么交给 `StaticPage` 时算"远端来源"
 * `StaticPage` 对非 `remote` 来源会挂"这不是最新的"提示（宪法 10.6）——那对**权威内置文本**
 * 是误导。所以页面把内置正文当作 `fetchRemote` 的返回值（它永远是本地即时可得、永不失败），
 * 语义上 = "这段文字就是权威版本，不需要网络"。⛔ 不是伪造来源：它确实不需要回落。
 */

import type { Locale } from '@/i18n';

export type LegalDocId = 'privacy' | 'terms';

export type LegalDoc = {
  id: LegalDocId;
  titleKey: 'me.legal.privacy' | 'me.legal.terms';
  route: string;
};

/** 两份法务文档（`M-19` / `M-20`） */
export const LEGAL_DOCS: readonly LegalDoc[] = [
  { id: 'privacy', titleKey: 'me.legal.privacy', route: '/me/legal/privacy' },
  { id: 'terms', titleKey: 'me.legal.terms', route: '/me/legal/terms' },
];

const PLACEHOLDER_NOTE_ZH =
  '> **本页是占位正文**：正式文本待所有者提供后替换（**上架前必办**）。\n\n';
const PLACEHOLDER_NOTE_EN =
  '> **This is placeholder text**: the final wording will replace it before store submission.\n\n';

const PRIVACY_ZH = `# 隐私政策

${PLACEHOLDER_NOTE_ZH}本应用会处理与校园生活相关的信息（账号、个人资料、你主动发布的内容）。**信息的收集范围与使用方式以正式文本为准**；在此之前，我们不新增任何收集项。

你可以随时在「我的」里修改或注销账号。
`;

const PRIVACY_EN = `# Privacy Policy

${PLACEHOLDER_NOTE_EN}This app handles campus-life information (your account, profile and anything you post). **The final text will define what is collected and how it is used**; until then we add no new collection.

You can edit or deactivate your account from "Me" at any time.
`;

const TERMS_ZH = `# 服务条款

${PLACEHOLDER_NOTE_ZH}使用本应用即表示你同意遵守校园社区的基本规范：不发布违法、侵权或骚扰性内容。

**发布用户内容前需要先接受本条款**（发帖门禁）。正式文本待提供后替换。
`;

const TERMS_EN = `# Terms of Service

${PLACEHOLDER_NOTE_EN}By using this app you agree to follow basic campus-community rules: no illegal, infringing or harassing content.

**You must accept these terms before posting user content** (publish gate). The final wording will replace this text.
`;

const BUNDLED: Record<LegalDocId, Record<Locale, string>> = {
  privacy: { zh: PRIVACY_ZH, en: PRIVACY_EN },
  terms: { zh: TERMS_ZH, en: TERMS_EN },
};

/** 取某份文档在某语言下的正文（⛔ 永远不返回空串：空白的法务页等于没有法务页） */
export function legalDocText(docId: LegalDocId, locale: Locale): string {
  return BUNDLED[docId][locale];
}

/** 三份文档 × 两种语言都非空（用例直接断言这一条） */
export function assertLegalDocsComplete(): void {
  for (const doc of LEGAL_DOCS) {
    for (const locale of ['zh', 'en'] as const) {
      if (legalDocText(doc.id, locale).trim().length === 0) {
        throw new Error(`法务文本缺失：${doc.id}/${locale}`);
      }
    }
  }
}
