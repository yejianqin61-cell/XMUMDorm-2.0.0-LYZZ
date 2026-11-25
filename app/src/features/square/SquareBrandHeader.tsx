/**
 * 广场品牌头（2026-10-18 所有者裁决）
 *
 * 排版：**校徽靠左，`XMUM Dorm` 紧挨其右，整行靠左**（所有者选定，别改成两端分布）。
 * 结构：本组件只画内容行；顶部 inset 与底色由 `Screen.header` 施加（宪法 17.1-S2）。
 *
 * 校徽两个变体：
 *   · 亮色主题 → `xmu-emblem.png`（官方墨色，透明底）；
 *   · 暗色主题 → `xmu-emblem-light.png`（反白），因为深藏青线稿在暗色画布上对比度只有 1.39:1。
 *   ⚠️ 具体色值与来源见 `app/assets/brand/SOURCE.md`（⛔ 本文件不写颜色字面量）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Bell from 'lucide-react-native/icons/bell';
import Search from 'lucide-react-native/icons/search';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useUnread } from '@/features/mailbox/useUnread';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

/** 素材来源与处理过程见 `app/assets/brand/SOURCE.md`（官方 PDF 矢量导出） */
const EMBLEM_DARK = require('../../../assets/brand/xmu-emblem-light.png');
const EMBLEM_LIGHT = require('../../../assets/brand/xmu-emblem.png');

/** 校徽显示边长（dp）。官方线稿较细，48dp 在 2x 屏上足够清晰 */
export const BRAND_EMBLEM_SIZE = 48;

export function SquareBrandHeader(): React.ReactElement {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { total } = useUnread();
  const source = theme.scheme === 'dark' ? EMBLEM_DARK : EMBLEM_LIGHT;

  return (
    <View
      testID="square-brand-header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space('space_3'),
        paddingLeft: theme.space('space_4'),
        paddingRight: theme.space('space_2'),
        paddingVertical: theme.space('space_2'),
      }}
    >
      <Image
        testID="square-brand-emblem"
        source={source}
        style={{ width: BRAND_EMBLEM_SIZE, height: BRAND_EMBLEM_SIZE }}
        contentFit="contain"
        accessibilityLabel={t('square.brand.emblem')}
      />
      <View style={{ flex: 1 }}>
        <Text role="headline" emphasis="strong" colorToken="text-primary">
          {t('square.brand')}
        </Text>
        {/* 原型：品牌名下一行日期（让首屏有"今天"的锚点） */}
        <Text testID="square-brand-date" role="caption" colorToken="text-secondary">
          {new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())}
        </Text>
      </View>
      {/* 原型 Main 的两个顶栏动作（第四轮，所有者确认）：搜索走树洞搜索，铃铛进消息格 */}
      <IconButton testID="square-header-search" Icon={Search} accessibilityLabel={t('square.header.search')}
        onPress={() => router.setParams({ tab: 'confession' })} />
      <IconButton testID="square-header-bell" Icon={Bell} accessibilityLabel={t('topbar.mailbox')} badgeCount={total ?? 0}
        onPress={() => router.navigate('/(tabs)/mailbox' as never)} />
    </View>
  );
}
