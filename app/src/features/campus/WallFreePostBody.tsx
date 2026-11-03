/**
 * WallFreePostBody —— 自由帖正文区（阶段 2 起是**文字海报**的薄封装）
 *
 * 版式、颜色、字阶、回退全部在 `WallPosterBody` / `wallPosterTemplates` / `wallPosterLayout`：
 *   · 信息流：`WallFreePostBody`（卡片内）
 *   · 详情：`WallFreePostText`（页面正文，复用同一个渲染组件）
 *   · 发布预览（阶段 2-B）：直接复用 `WallPosterBody`
 *
 * 本文件**故意保持薄**：外壳（`WallCardShell`）只认这两个入口，换模板不用动外壳。
 */

import * as React from 'react';

import { WallPosterBody } from './WallPosterBody';
import type { WallPosterTemplateId } from './wallPosterTemplates';

export type WallFreePostBodyProps = {
  content: string;
  /** 已保存 / 已选定的模板；缺省按文字特征确定性推荐 */
  templateId?: WallPosterTemplateId;
  /** 预览"全部模板"时关掉实测回退，如实展示所选模板（默认开） */
  allowFallback?: boolean;
};

/** 信息流卡片内的自由帖正文 */
export function WallFreePostBody({
  content,
  templateId,
  allowFallback = true,
}: WallFreePostBodyProps): React.ReactElement {
  return (
    <WallPosterBody
      content={content}
      {...(templateId === undefined ? {} : { templateId })}
      allowFallback={allowFallback}
      testID="wall-free-body"
    />
  );
}

/**
 * 详情页正文（页面级，不放在卡片里）。
 *
 * 与信息流**同一个渲染组件**：详情不是另一套版式，只是宽度 / 上下文不同；
 * 超长内容在详情里同样完整渲染（模板回退只换版式，⛔ 不截断原文）。
 */
export function WallFreePostText({ content, templateId }: WallFreePostBodyProps): React.ReactElement {
  return (
    <WallPosterBody
      content={content}
      {...(templateId === undefined ? {} : { templateId })}
      testID="wall-free-text-block"
    />
  );
}
