/**
 * ⚠️ 第 5 格的**占位路由**（只做重定向）。
 *
 * 为什么需要它：`NativeTabs.Trigger` **必须**有一个已存在的路由名（R2 已核实），
 * 而第 5 格的语义是**动作**（打开发布中心），不是目的地。
 *
 * 因此：这个路由**永远不该被用户看到** —— 点第 5 格不会切到这里（`disabled` 拦下导航），
 * 但**深链 `/publish` 仍能直达**（官方注明 `disabled` 挡不住 `router.push`），
 * 所以这里必须重定向，⛔ 不能留成空白页或死路由（否则污染返回栈，违反 4.9.2）。
 *
 * 真正的发布中心在 `src/app/publish-center.tsx`。
 */
import * as React from 'react';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function PublishSlotPlaceholder(): React.ReactElement {
  return <Redirect href={Platform.OS === 'web' ? '/publish-center' : '/'} />;
}
