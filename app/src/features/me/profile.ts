/**
 * 「我的」的资料与入口的**纯规则**（P2C-03）
 *
 * 数据源：`GET /api/users/me`（`routes/users.js:132-170`）。它返回的东西里有两处**不能直接用**：
 *   1. `avatar` 可能是**相对路径**（用户没头像时后端给 `/uploads/default-avatar.png`，
 *      见 `routes/users.js:21`）→ 必须过 `getUploadUrl()`，否则真机上是空白图；
 *   2. `badgeEmoji`（🌱🧭✨…）**不进界面** —— 宪法禁 Emoji 图标；等级用词条名表达。
 *
 * ⛔ 本文件不 import 任何 UI 组件。
 */

import type { MessageKey } from '@/i18n';
import { getUploadUrl } from '../../../../shared/api/config';

export type MeProfile = {
  id: number | null;
  displayName: string | null;
  avatarUri: string | null;
  level: number;
  /** 0–1；拿不到为 0（`K16` 会夹紧） */
  progress: number;
  /** 后端 `progressText`，形如 `"12/200"`（⛔ 前端不自己拼） */
  progressText: string | null;
  college: string | null;
  grade: string | null;
  major: string | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/** 头像 URL 归一化（幂等：已经是绝对地址就原样返回） */
export function avatarUriOf(avatar: unknown): string | null {
  const raw = asString(avatar);
  return raw === null ? null : getUploadUrl(raw);
}

/** 等级 → 词条 key（6 级；`constants/levelThresholds.js:4-11` 的名字在这 6 个词条里） */
export function levelNameKey(level: number): MessageKey {
  const clamped = Math.min(6, Math.max(1, Math.floor(Number(level) || 1)));
  return `me.level.${clamped}` as MessageKey;
}

/** `/api/users/me` 载荷 → 页面要的形状（缺字段给空，⛔ 不抛） */
export function normalizeProfile(payload: unknown): MeProfile {
  const raw = isObject(payload) ? payload : {};
  const progress = isObject(raw.levelProgress) ? raw.levelProgress : {};
  const id = Number(raw.id);
  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    displayName: asString(raw.nickname) ?? asString(raw.username),
    avatarUri: avatarUriOf(raw.avatar),
    level: Math.min(6, Math.max(1, Math.floor(Number(raw.level) || 1))),
    progress: Number(progress.progress) > 0 ? Number(progress.progress) : 0,
    progressText: asString(progress.progressText),
    college: asString(raw.college),
    grade: asString(raw.grade),
    major: asString(raw.major),
  };
}

/** 「我的」的入口行（**数据驱动**：加一项就多一行，⛔ 不动页面结构） */
export type MeEntryKey = 'posts' | 'settings' | 'about';

export type MeEntry = {
  key: MeEntryKey;
  labelKey: MessageKey;
  route: string;
  /**
   * ⚠️ **路由文件还不存在时不许显示**（否则点进去是 404）。
   * 每个 `available: true` 的条目都有用例检查对应路由文件真的在磁盘上；
   * 反过来，**账本**（`EXPECTED_UNAVAILABLE`）逼着后来者在 P2C-04/P2C-05 落地时把它翻过来。
   */
  available: boolean;
};

export const ME_ENTRIES: readonly MeEntry[] = [
  { key: 'posts', labelKey: 'me.entry.posts', route: '/me/posts', available: true },
  { key: 'settings', labelKey: 'me.entry.settings', route: '/me/settings', available: false },
  { key: 'about', labelKey: 'me.entry.about', route: '/me/legal', available: false },
];

/**
 * **缺口账本**：当前还没落地的入口。
 * ⛔ 落地一个就要从这里删一个（`P2C-05`/`P2C-06` 负责），漏删或假删都会让用例变红。
 */
export const EXPECTED_UNAVAILABLE: readonly MeEntryKey[] = ['settings', 'about'];

/** 界面上真正显示的入口（只显示已经能进去的） */
export function visibleEntries(entries: readonly MeEntry[] = ME_ENTRIES): MeEntry[] {
  return entries.filter((entry) => entry.available);
}
