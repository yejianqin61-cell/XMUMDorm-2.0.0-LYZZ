/**
 * `/dev/wall-poster` —— 文字海报视觉实验页（阶段 2 · 节点 A 专用）
 *
 * ⚠️ **临时路由**：与 `WallSampleBand` 一起在节点 B（接真实发布）时删除。
 * 之所以不放进 `__DEV__` 门后：节点 A 的验收包是 release APK，`__DEV__` 为 false，
 * 放进开发门里等于"实机上永远看不到"。
 */

import * as React from 'react';

import { WallPosterLab } from '@/features/campus/WallPosterLab';

export default function WallPosterLabRoute(): React.ReactElement {
  return <WallPosterLab />;
}
