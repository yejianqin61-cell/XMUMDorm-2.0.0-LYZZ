/**
 * 广场 4 个模块入口（2026-10-18 所有者裁决）
 *
 * 位置：**品牌头下方、Tab 条上方，所有 Tab 常驻**（所有者选定）。
 * 视觉：64dp 圆角填充块 + 32dp Lucide 图标 + 一行标签；蓝 / 黄交替（令牌见 `squareModules.tsx`）。
 * 行为：点击**直接 push 对应页面**，不切换 Tab、不改选中态、不新增中间页。
 *
 * ⚠️ 这是"页内功能入口"，与宪法 4.8 禁止的"用宫格替代二级导航"不是一回事：
 *    二级导航仍由 `TopTabStrip` 承担，入口只把已移除的三个模块与课表送到独立页面。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { SQUARE_MODULES } from './squareModules';

/** 填充块边长（dp）。所有者要求"图标要大点、要有填充颜色" */
export const MODULE_TILE_SIZE = 64;

export function SquareModuleEntries(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View
      testID="square-modules"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.space('space_2'),
      }}
    >
      {SQUARE_MODULES.map((entry) => {
        const label = t(entry.labelKey);
        return (
          <Pressable
            key={entry.key}
            testID={`square-module-${entry.key}`}
            accessibilityLabel={label}
            onPress={() => router.push(entry.route)}
            contentAlign="stretch"
            style={{ flex: 1, alignItems: 'center', gap: theme.space('space_1') }}
          >
            <View
              style={{
                alignSelf: 'stretch',
                paddingVertical: theme.space('space_3'),
                borderRadius: theme.radius('radius_large'),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.color['bg-surface'].value,
              }}
            >
              <Icon source={entry.icon} size="large" tint="brand" />
              <Text
                role="caption"
                colorToken="text-primary"
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={{ marginTop: theme.space('space_1') }}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
