/**
 * 发布表单承载页（**一条动态路由承载全部发布表单**）
 *
 * 为什么不是"每类发布一个路由文件"：宪法 9.2 要求表单做成**参数化框架**
 * （表单与列表是最大的两个桶，合计 37.9%），Phase 1 的 `FormScreen` 就是它。
 * 因此在 Phase 0 就把入口收成 `/publish/[type]`，Phase 1 把 body 换成 `FormScreen` 即可。
 *
 * ⛔ 提交链路必须过 A-05 门禁（宪法 4.9.8 / 12.2）—— 见 `features/publish/complianceGate.ts`。
 * 未知 type：**重定向回发布中心**，⛔ 不显示"未知类型"这类技术性文案（10.4）。
 */
import * as React from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { PUBLISH_CENTER_ROUTE } from '@/features/navigation/tabConfig';
import { getPublishEntry, type PublishId } from '@/features/publish/registry';

export default function PublishFormHost(): React.ReactElement {
  const params = useLocalSearchParams<{ type?: string }>();
  const entry = getPublishEntry(params.type as PublishId);

  if (!entry) {
    return <Redirect href={PUBLISH_CENTER_ROUTE} />;
  }

  // Phase 1：这里换成 FormScreen（字段描述符 DSL）+ 提交前的 canSubmit 门禁
  return (
    <Screen
      testID={`screen-publish-form-${entry.id}`}
      titleKey={entry.titleKey}
      bottomMode="own"
    />
  );
}
