/**
 * 我的（`M-01`）—— **仪表盘**（P2C-03）
 *
 * ## 为什么这里没有 `src/proto/P7`
 * 组件定义 §2.7 明写 `P7 仪表盘`**没有独立模块**（它是"页面级组合"）→ 本文件就是那个组合。
 *
 * ## 四块内容与**分区降级**
 * 「当前/下一节课 + 今日待办 + 未读 + 等级进度」。四个数据源各自独立：
 * **哪一块挂了只降级哪一块**（`InlineNotice` + 重试），⛔ 不整屏报错 —— 否则"待办接口抖了一下"
 * 会把整页（包括还好的资料与课表）一起吞掉。
 *
 * ## 跨轨依赖（如实记账）
 * 今日课程用 `features/tools/timetable.ts` 的 `useTimetableWeek` —— 那是**乙的课表缓存**。
 * ⛔ 这里刻意不写第二份缓存（纪律 4：不新建第二套机制）；代价是「我的」依赖乙的模块，
 * 这条依赖是**单向只读**的（不 import 乙的页面，只用它的取数外壳与纯函数）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import PagerView from 'react-native-pager-view';
import Pencil from 'lucide-react-native/icons/pencil';
import Settings from 'lucide-react-native/icons/settings';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ExpBar } from '@/components/ui/ExpBar';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { IconButton } from '@/components/ui/IconButton';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import { getSecondaryTabs } from '@/features/navigation/secondaryTabs';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TAB_BAR_CLEARANCE } from '@/app/(tabs)/_layout';
import { levelNameKey, type MeProfile } from './profile';
import { MeContentPane, type MeContentKey } from './ContentPanes';
import { useMeProfile } from './useMeProfile';

const EMPTY_PROFILE: MeProfile = {
  id: null,
  displayName: null,
  avatarUri: null,
  level: 1,
  progress: 0,
  progressText: null,
  college: null,
  grade: null,
  major: null,
};

export function MeScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  /**
   * 资料单一取数点（阶段2-02）：会话就绪才取、失败保留旧数据、重试走同一个查询。
   * ⛔ 本页不再自己 `getMe()`（冷启动抢跑 401 的病根就在那）。
   */
  const me = useMeProfile();
  const profile = me.profile ?? EMPTY_PROFILE;

  // 集合来自**唯一真源**（`secondaryTabs.ts`），⛔ 主页不另写一份（P2A-03 扫描盯着）
  const tabs = getSecondaryTabs('me');
  const [selectedKey, setSelectedKey] = React.useState(tabs[0]?.key ?? '');
  const pagerRef = React.useRef<PagerView>(null);

  /**
   * 选中键是**唯一状态源**，Tab 条与 pager 都是它的投影（⛔ 不搞两个 state 互相同步）。
   * 正向：点 Tab → 翻页；反向：横滑翻页 → 回写选中键。
   */
  const selectTab = React.useCallback(
    (key: string) => {
      setSelectedKey(key);
      const index = tabs.findIndex((tab) => tab.key === key);
      if (index >= 0) pagerRef.current?.setPage(index);
    },
    [tabs]
  );

  const onPageSelected = React.useCallback(
    (event: { nativeEvent: { position: number } }) => {
      const next = tabs[event.nativeEvent.position];
      if (next !== undefined) setSelectedKey(next.key);
    },
    [tabs]
  );

  return (
    <Screen
      testID="screen-me"
      titleKey="screen.me"
      bottomMode="tabbar"
      tabBarHeight={TAB_BAR_CLEARANCE}
      topBarActions={<>
        <IconButton testID="me-edit-entry" Icon={Pencil} accessibilityLabel={t('me.edit.entry')} onPress={() => router.push('/me/edit')} />
        <IconButton testID="me-settings-entry" Icon={Settings} accessibilityLabel={t('me.entry.settings')} onPress={() => router.push('/me/settings')} />
      </>}
    >
      <View style={{ flex: 1, gap: theme.space('space_2') }}>
        {/* ── 资料卡：头像 + 昵称 + 等级 + 经验（固定区，不随 Tab 滚动） ── */}
        <View style={{ padding: theme.space('space_4') }}>
          <Card testID="me-profile" variant="outlined" padding="space_4">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_3') }}>
              <Avatar size="space_12" uri={profile.avatarUri ?? undefined} />
              <View style={{ flex: 1, gap: theme.space('space_1') }}>
                <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
                  {profile.displayName ?? t('auth.signedOut')}
                </Text>
                <LevelBadge
                  testID="me-level"
                  level={profile.level}
                  name={t(levelNameKey(profile.level))}
                  variant="iconWithName"
                />
              </View>
            </View>
            <View style={{ marginTop: theme.space('space_3') }}>
              <ExpBar
                testID="me-exp"
                progress={profile.progress}
                text={profile.progressText ?? undefined}
                variant="full"
              />
            </View>
            {me.failed ? (
              <InlineNotice
                testID="me-profile-failed"
                tone="warning"
                message={t('me.section.failed')}
                actionLabel={t('action.retry')}
                onAction={() => void me.refresh()}
              />
            ) : null}
          </Card>
        </View>

        {/* ── 「更多」= 四个内容 Tab（C-05 拍板；集合在 secondaryTabs.ts） ── */}
        {tabs.length > 0 ? (
          <>
            <View style={{ paddingHorizontal: theme.space('space_4') }}>
              <SectionHeader title={t('me.entries.title')} />
            </View>
            <TopTabStrip
              testID="me-content-tabs"
              tabs={tabs}
              selectedKey={selectedKey}
              onSelect={selectTab}
            />
            {/* 四页常驻（pager 的行为），取数由 pane 自己的 `active` 门控制 */}
            <PagerView
              ref={pagerRef}
              style={{ flex: 1 }}
              initialPage={0}
              onPageSelected={onPageSelected}
            >
              {tabs.map((tab) => (
                <View key={tab.key} testID={`me-content-page-${tab.key}`} style={{ flex: 1 }}>
                  <MeContentPane
                    kind={tab.key as MeContentKey}
                    active={selectedKey === tab.key}
                  />
                </View>
              ))}
            </PagerView>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
