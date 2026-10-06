/**
 * 发布描述符**注册点**（甲独占；域各写自己的 `publishFields.ts`）
 *
 * ## 为什么要有"缺口账本"
 * 发布注册表里有 5 条 `status:'ready'`，但 Phase A 交付时**一条描述符都还没有**
 * （它们归乙丙的域）。如果断言写成"每个 ready 条目都要有描述符"，Phase A 一开工就是红的
 * 且**甲一个人修不好**；如果写成"允许缺失"，那缺失会永远没人管。
 *
 * 所以用一个**显式账本** `KNOWN_MISSING_DESCRIPTORS`：
 *   · 断言 = "**实际缺的** == **账本里写的**"；
 *   · 交了一份描述符却忘了从账本划掉 → **红**（防止漏登记）；
 *   · 从账本划掉了却没交描述符 → **红**（防止假进度）。
 *
 * 每交一份，账本就短一行 —— 进度在代码里可见，不靠人记。
 *
 * ## 域交付时怎么加（三步，⛔ 不改别的文件）
 * 1. 在自己的 feature 目录写 `publishFields.ts`，`export default` 一个 `PublishFormDescriptor`；
 * 2. 在本文件的 `PUBLISH_DESCRIPTORS` 里加一行（甲当天加，或提 issue）；
 * 3. 从 `KNOWN_MISSING_DESCRIPTORS` 删掉那个 id。
 */

import { assertDescriptorInvariants, readyPublishIds, type PublishFormDescriptor } from './descriptor';
import type { PublishId } from './registry';

/**
 * 已交付的描述符（id → 描述符）。
 * ⛔ 域文件不许 import 本文件（会成环）；依赖方向只能是 本文件 → 域文件。
 */
export const PUBLISH_DESCRIPTORS: Partial<Record<PublishId, PublishFormDescriptor>> = {};

/**
 * **缺口账本**：已就绪但还没交描述符的发布类型。
 * ⚠️ 交一份就删一行；⛔ 不许"先删了等以后补"。
 */
export const KNOWN_MISSING_DESCRIPTORS: readonly PublishId[] = [
  'clubActivity',
  'confession',
  'errand',
  'marketplace',
  'wall',
];

export function getPublishDescriptor(id: PublishId): PublishFormDescriptor | undefined {
  return PUBLISH_DESCRIPTORS[id];
}

function sorted(ids: readonly PublishId[]): PublishId[] {
  return [...ids].sort();
}

/** 实际缺描述符的就绪类型（从注册表派生，⛔ 不写死） */
export function missingDescriptorIds(): PublishId[] {
  return sorted(readyPublishIds().filter((id) => getPublishDescriptor(id) === undefined));
}

/** 账本不变量：**实际缺的** 必须 **恰好等于** 账本里写的 */
export function assertDescriptorLedger(): void {
  const actual = missingDescriptorIds();
  const declared = sorted(KNOWN_MISSING_DESCRIPTORS);
  if (actual.join(',') !== declared.join(',')) {
    throw new Error(
      `发布描述符缺口账本与实际不符 —— 实际缺：[${actual.join(', ')}]，账本写：[${declared.join(', ')}]` +
        '（交了一份描述符就从 KNOWN_MISSING_DESCRIPTORS 删掉它；⛔ 不许只删账本不交描述符）'
    );
  }
}

/** 全量不变量（构造期/用例期都跑这一条） */
export function assertPublishDescriptors(dictionaryKeys: readonly string[]): void {
  assertDescriptorInvariants(Object.values(PUBLISH_DESCRIPTORS).filter(Boolean) as PublishFormDescriptor[], dictionaryKeys);
  assertDescriptorLedger();
}
