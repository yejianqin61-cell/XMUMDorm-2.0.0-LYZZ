/**
 * 发布表单**描述符契约**（甲独占：类型与不变量在这里，字段内容按域分文件）
 *
 * ## 为什么不是 `FormScreen`
 * `P4` 骨架**就是**组件层的 `K01 Form`（组件定义 §2.7 的原型落点表）。
 * 再包一层 `FormScreen` 组件就是**套壳**（9.14-②），所以这里只定义
 * **数据契约**，UI 一律复用 `components/ui/Form.tsx`：
 *
 * ```
 *   /publish/[type]  ──取描述符──▶  usePublishForm(descriptor)  ──▶  <Form .../>
 *   （路由=组合根）                   （宿主：状态/草稿/门禁/去向）        （组件层，不动）
 * ```
 *
 * ## 四条不变量（本文件是唯一实现处）
 * 1. **id 必须在发布注册表里**，且**只能是 `status:'ready'`** —— 给 `planned`
 *    （拼车 / 问答，后端 0 表 0 端点）配表单 = 让用户走到一个必然失败的提交。
 * 2. **同一表单内字段名唯一** —— 重名会让草稿覆盖、错误定位错位。
 * 3. **`labelKey` 必须在词条表里存在** —— 否则界面上出现的是 key 本身。
 * 4. **媒体字段必须 `neverDraft:true`**，且 **`create` 语义必须给落地路由**
 *    —— 前者避免把"重启后失效的本地 URI"写进 AsyncStorage，
 *    后者避免"发完了但不知道去哪"。
 *
 * ⛔ 本文件不渲染任何东西，也不 import 任何 UI 组件（可纯函数测）。
 */

import type { FormSectionDescriptor, SubmitSemantic } from '@/components/ui/Form';
import type { FormFieldDescriptor, FormValues } from '@/components/ui/FormField';
import type { MessageKey } from '@/i18n';
import { PUBLISH_REGISTRY, type PublishId } from './registry';

/** 提交结果：`id` 用于成功后的落地路由，`route` 由域直接指定去向 */
export type PublishSubmitResult = { id?: number | string; route?: string | null };

/**
 * 一个发布表单的完整域契约。
 * ⛔ 域文件只声明**自己的**一份；注册点由甲独占（见 `descriptors.ts`）。
 */
export type PublishFormDescriptor = {
  id: PublishId;
  /** 分节 + 字段（`K01 Form` 的 `sections`） */
  sections: readonly FormSectionDescriptor[];
  /** 提交语义 → 成功后做什么（`K01` 的 `postSubmitPlan`） */
  semantic: SubmitSemantic;
  /** 提交：只负责"把值交给后端"，⛔ 不碰导航（导航归宿主） */
  submit: (values: FormValues) => Promise<PublishSubmitResult | void>;
  /** `create` 语义必填：提交成功后去哪（`null` = 留在原地） */
  /** Replace the form with this list before pushing a new detail, including system back. */
  listAfterSubmit?: string;
  routeAfterSubmit?: (result: PublishSubmitResult | void) => string | null;
  /**
   * **媒体字段名**（`kind:'custom'` 渲染图片选择器的那几个）。
   * ⚠️ 必须逐个声明：DSL 没有媒体 kind，不声明就没法机器校验 `neverDraft`。
   */
  mediaFields?: readonly string[];
  /** 草稿 id（默认 `publish:<id>`） */
  formId?: string;
  /** 提交按钮文案（默认 `publish.submit`） */
  submitLabelKey?: MessageKey;
  /** 提交成功回执文案（默认 `publish.submitted`；域可给更准的，如"已发布"） */
  successKey?: MessageKey;
};

/** 草稿 key：⛔ 不许用形如 `…password…` 的 id（落盘层会拒绝，见 `canPersistDraft`） */
export function draftFormIdFor(descriptor: PublishFormDescriptor): string {
  return descriptor.formId ?? `publish:${descriptor.id}`;
}

/** 描述符的全部字段（扁平；校验与草稿都用它） */
export function fieldsOf(descriptor: PublishFormDescriptor): readonly FormFieldDescriptor[] {
  return descriptor.sections.flatMap((section) => section.fields);
}

function entryOf(id: PublishId) {
  return PUBLISH_REGISTRY.find((entry) => entry.id === id);
}

/**
 * 描述符不变量。任一不满足即抛 —— 让"契约烂掉"在合并前失败，而不是运行期白屏。
 */
export function assertDescriptorInvariants(
  descriptors: readonly PublishFormDescriptor[],
  dictionaryKeys: readonly string[]
): void {
  const ids = descriptors.map((descriptor) => descriptor.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('发布描述符 id 重复');
  }

  for (const descriptor of descriptors) {
    const entry = entryOf(descriptor.id);
    if (!entry) {
      throw new Error(`发布描述符指向未注册的发布类型：${descriptor.id}`);
    }
    // ⛔ planned = 后端未建（拼车 / 问答）→ 不许有表单
    if (entry.status !== 'ready') {
      throw new Error(`发布描述符指向未就绪的发布类型：${descriptor.id}（status=${entry.status}）`);
    }

    const fields = fieldsOf(descriptor);
    const names = fields.map((field) => field.name);
    if (new Set(names).size !== names.length) {
      throw new Error(`描述符 ${descriptor.id} 存在重名字段`);
    }

    for (const field of fields) {
      if (!dictionaryKeys.includes(field.labelKey)) {
        throw new Error(
          `描述符 ${descriptor.id} 的字段 ${field.name} 的 labelKey 不在词条表：${field.labelKey}`
        );
      }
    }

    for (const name of descriptor.mediaFields ?? []) {
      const field = fields.find((candidate) => candidate.name === name);
      if (!field) {
        throw new Error(`描述符 ${descriptor.id} 声明的媒体字段不存在：${name}`);
      }
      if (field.neverDraft !== true) {
        throw new Error(
          `描述符 ${descriptor.id} 的媒体字段 ${name} 必须 neverDraft:true —— 本地 URI 重启后失效，落草稿等于给用户一个坏图`
        );
      }
    }

    if (descriptor.semantic === 'create' && typeof descriptor.routeAfterSubmit !== 'function') {
      throw new Error(`描述符 ${descriptor.id} 是 create 语义，必须给 routeAfterSubmit（发完要知道去哪）`);
    }
  }
}

/** 提交成功后的去向（纯函数）：域给的路由优先，否则走 `routeAfterSubmit` */
export function resolvePublishDestination(
  descriptor: PublishFormDescriptor,
  result: PublishSubmitResult | void
): string | null {
  const fromResult = result && typeof result === 'object' ? result.route ?? null : null;
  if (fromResult) return fromResult;
  return descriptor.routeAfterSubmit?.(result) ?? null;
}

/** 注册表里**就绪**的发布类型（账本的分母，从注册表派生，⛔ 不写死） */
export function readyPublishIds(): PublishId[] {
  return PUBLISH_REGISTRY.filter((entry) => entry.status === 'ready').map((entry) => entry.id);
}
