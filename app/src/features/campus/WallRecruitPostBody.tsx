/**
 * WallRecruitPostBody —— 招募帖的**阶段 1 内部结构**（临时样板，收尾版）
 *
 * 只展示最基本的结构化信息：标题、描述、人数、时间、地点、状态。
 * ⛔ 不实现招募发布、编辑、人数维护或专属私聊（阶段 5 / 6）；
 * ⛔ 不复用自由帖的文字海报版式 —— 招募帖按信息清晰、结构紧凑来排。
 *
 * 首页密度（所有者 2026-11-02 实机验收后定稿）：
 *   · 标题与描述各**最多两行**，超出省略；完整原文在数据里（`WallRecruit`），
 *     阶段 5 的详情/编辑读的是同一份全文，⛔ 不是数据层截断；
 *   · 字号按现有字阶取值：标题 `label`（16sp，粗）> 描述 `body`（14sp，常规），
 *     ⛔ 不新造字号数字（宪法 2.5 / 设计债尺子会拦）；
 *   · 人数 / 时间 / 地点 / 状态保留，保证首页仍能判断要不要点开。
 */

import * as React from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { WallRecruit } from './wallPost';

export function WallRecruitPostBody({ recruit }: { recruit: WallRecruit }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const statusLabel = t(recruit.status === 'open' ? 'wall.recruit.open' : 'wall.recruit.full');

  return (
    <View testID="wall-recruit-body" style={{ gap: theme.space('space_2') }}>
      <View style={{ gap: theme.space('space_1') }}>
        <Text
          testID="wall-recruit-title"
          role="label"
          emphasis="strong"
          colorToken="text-primary"
          numberOfLines={2}
        >
          {recruit.title}
        </Text>
        <Text
          testID="wall-recruit-description"
          role="body"
          colorToken="text-secondary"
          numberOfLines={2}
        >
          {recruit.description}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: theme.space('space_6'),
          rowGap: theme.space('space_1'),
        }}
      >
        <RecruitField
          testID="wall-recruit-headcount"
          label={t('wall.recruit.people')}
          value={recruit.headcount}
        />
        <RecruitField label={t('wall.recruit.time')} value={recruit.time} />
        <RecruitField label={t('wall.recruit.place')} value={recruit.place} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        <Text role="caption" colorToken="text-muted">
          {t('wall.recruit.status')}
        </Text>
        <Badge
          testID="wall-recruit-status"
          text={statusLabel}
          tone={recruit.status === 'open' ? 'success' : 'neutral'}
        />
      </View>
    </View>
  );
}

/** 一行结构化信息：弱化字段名 + 强调取值（字段名 ≤4 汉字，取值可换行） */
function RecruitField({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View testID={testID} style={{ gap: theme.space('space_1') }}>
      <Text role="caption" colorToken="text-muted">
        {label}
      </Text>
      <Text role="body" emphasis="strong" colorToken="text-primary">
        {value}
      </Text>
    </View>
  );
}
