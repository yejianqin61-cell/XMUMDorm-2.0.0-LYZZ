/**
 * WallPosterBody —— 自由帖的**文字海报渲染**（阶段 2 · 节点 A）
 *
 * 一处实现，三处复用：信息流卡片、帖子详情、发布预览（阶段 2-B）。
 * ⛔ 不再有"预览一套、首页一套"的重复版式，避免预览正常但发布后溢出。
 *
 * 结构（外壳仍由 `WallCardShell` 提供，本组件只负责文字区）：
 *
 *   ┌─ 模板底色块（颜色 / 圆角 / 内边距由模板配置给）────────┐
 *   │  正文（字阶角色 + 对齐由"长度档 × 模板"决定）            │
 *   └──────────────────────────────────────────────────────┘
 *
 * 三条纪律：
 *  1. **颜色 / 字号只来自令牌**：底色取模板配置里的语义令牌，字阶走 `Text` 的 role；
 *     ⛔ 本文件不写色值与字号数字。
 *  2. **实测复核**（§8.4）：`onTextLayout` 拿到真实行数，超过模板 `maxLines` 时按
 *     配置链回退（A/C/D → B → E），⛔ 不缩字号、⛔ 不截断原文。
 *  3. **稳定性**：没给模板 ID 时用 `recommendWallPoster`（纯函数）推导，
 *     同一段文字每次得到同一模板；随机只发生在发布前的候选生成。
 */

import * as React from 'react';
import { View, type TextLayoutEvent } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import {
  analyzeWallText,
  recommendWallPoster,
  wallPosterBandOf,
  wallPosterFallback,
  wallPosterSeed,
} from './wallPosterLayout';
import {
  WALL_POSTER_MAX_FONT_SCALE,
  wallPosterTemplate,
  wallPosterTypeStyle,
  type WallPosterTemplateId,
} from './wallPosterTemplates';

/** 配置链最多回退两步（A/C/D → B → E）；再长就不是"回退"而是无限换了 */
const MAX_FALLBACK_STEPS = 2;

export type WallPosterBodyProps = {
  content: string;
  /** 已选定的模板（阶段 2-B 来自后端）；缺省时按文字特征确定性推荐 */
  templateId?: WallPosterTemplateId;
  /**
   * 是否允许"实测超限 → 回退"。
   * 预览实验页的"全部模板"要**如实展示**每个模板，所以那里关掉（默认开）。
   */
  allowFallback?: boolean;
  testID?: string;
};

export function WallPosterBody({
  content,
  templateId,
  allowFallback = true,
  testID = 'wall-free-body',
}: WallPosterBodyProps): React.ReactElement {
  const requested = templateId ?? recommendWallPoster(content).templateId;
  /**
   * 用正文指纹 + 模板做 key：内容或模板一变就**重挂载**，上一段文字的回退状态
   * 自然归零。⛔ 不用 `useEffect` 里 setState 重置（会多一帧旧版式，也触发
   * `react-hooks/set-state-in-effect`）。
   */
  const fitKey = `${requested}:${content.length}:${wallPosterSeed(content)}`;

  return (
    <WallPosterFrame
      key={fitKey}
      content={content}
      requested={requested}
      allowFallback={allowFallback}
      testID={testID}
    />
  );
}

function WallPosterFrame({
  content,
  requested,
  allowFallback,
  testID,
}: {
  content: string;
  requested: WallPosterTemplateId;
  allowFallback: boolean;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();
  const profile = React.useMemo(() => analyzeWallText(content), [content]);
  const [override, setOverride] = React.useState<WallPosterTemplateId | null>(null);
  const [steps, setSteps] = React.useState(0);

  const effective = override ?? requested;
  const template = wallPosterTemplate(effective);
  const typography = wallPosterTypeStyle(effective, wallPosterBandOf(profile));
  const radius = template.radius === 'none' ? null : theme.radius(template.radius);
  const paddingX = template.paddingX === 'none' ? null : theme.space(template.paddingX);
  const paddingY = theme.space(template.paddingY);

  const onTextLayout = React.useCallback(
    (event: TextLayoutEvent) => {
      if (!allowFallback) return;
      const lines = event.nativeEvent.lines.length;
      if (lines <= template.limits.maxLines) return;
      const next = wallPosterFallback(effective);
      if (next === null || steps >= MAX_FALLBACK_STEPS) return;
      setOverride(next);
      setSteps((value) => value + 1);
    },
    [allowFallback, effective, steps, template.limits.maxLines]
  );

  return (
    <View testID={testID}>
      <View
        testID={`wall-poster-${effective}`}
        style={{
          // 底色只能来自模板配置里的语义令牌（P1-04 的底色门禁要求这一行可被静态识别）。
          // plainEssay 刻意**不铺底色**：它要同时融进白色卡片与详情页画布。
          ...(template.backgroundToken === null
            ? null
            : { backgroundColor: theme.color[template.backgroundToken].value }),
          ...(radius === null ? null : { borderRadius: radius }),
          ...(paddingX === null ? null : { paddingHorizontal: paddingX }),
          paddingVertical: paddingY,
        }}
      >
        <Text
          testID="wall-free-text"
          role={typography.role}
          emphasis={typography.emphasis}
          colorToken={template.textToken}
          align={template.align}
          maxFontSizeMultiplier={WALL_POSTER_MAX_FONT_SCALE}
          onTextLayout={onTextLayout}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}
