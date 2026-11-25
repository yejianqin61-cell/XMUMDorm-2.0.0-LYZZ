/**
 * TreeholeTagFilter —— 树洞标签筛选（**横滑标签条**）
 *
 * 第四轮（R4-14 / 原型 Treehole）：原来的整行下拉框要点三下才能换一个标签，改回横滑标签条，
 * 单选：点中的再点一次回到「全部」。用共用的 `FilterChips`（角色是 button + selected，不是导航 Tab）。
 */

import * as React from 'react';

import { FilterChips } from '@/components/ui/FilterChips';
import { useI18n } from '@/i18n';

/** 只要求服务端标签行的最小展示字段（snake_case，与 `tags` 接口同形） */
export type TreeholeTagOption = {
  id: number;
  name_zh?: string | null;
  name_en?: string | null;
};

/** 标签展示名：当前语言优先，缺一种回退另一种；两者都空返回空串（调用方据此隐藏） */
export function treeholeTagLabel(tag: TreeholeTagOption, locale: 'zh' | 'en'): string {
  const primary = locale === 'en' ? tag.name_en : tag.name_zh;
  const fallback = locale === 'en' ? tag.name_zh : tag.name_en;
  return (primary || fallback)?.trim() ?? '';
}

export const TREEHOLE_TAG_ALL = 'all';

export type TreeholeTagFilterProps = {
  tags: readonly TreeholeTagOption[];
  selectedTagId: number | null;
  onSelect: (tagId: number | null) => void;
  testID?: string;
};

export function TreeholeTagFilter({
  tags,
  selectedTagId,
  onSelect,
  testID = 'campus-tag-filter',
}: TreeholeTagFilterProps): React.ReactElement | null {
  const { t, locale } = useI18n();
  const options = React.useMemo(
    () => [
      { key: TREEHOLE_TAG_ALL, label: t('action.all') },
      // 空标签（两种语言都缺）不进入标签条：宁可少一项，也不给一个看不见的选项
      ...tags.flatMap((tag) => {
        const label = treeholeTagLabel(tag, locale);
        return label ? [{ key: String(tag.id), label }] : [];
      }),
    ],
    [locale, t, tags]
  );
  // 标签目录为空（接口失败/未加载）时整条隐藏：⛔ 不阻断阅读
  if (tags.length === 0) return null;
  return (
    <FilterChips
      testID={testID}
      itemTestIDPrefix={`${testID}-chip`}
      options={options}
      selected={[selectedTagId === null ? TREEHOLE_TAG_ALL : String(selectedTagId)]}
      onToggle={(next) => {
        if (next === TREEHOLE_TAG_ALL) {
          onSelect(null);
          return;
        }
        const id = Number(next);
        onSelect(Number.isSafeInteger(id) && id > 0 ? (id === selectedTagId ? null : id) : null);
      }}
    />
  );
}
