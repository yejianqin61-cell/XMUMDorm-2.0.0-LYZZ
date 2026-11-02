/**
 * WallRecruitPostBody —— 招募帖的**阶段 1 内部结构**（临时样板）
 *
 * 只展示最基本的结构化信息：标题、描述、人数、时间、地点、状态。
 * ⛔ 不实现招募发布、编辑、人数维护或专属私聊（阶段 5 / 6）；
 * ⛔ 不复用自由帖的文字海报版式 —— 招募帖按信息清晰、结构紧凑来排。
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
    <View testID="wall-recruit-body" style={{ gap: theme.space('space_3') }}>
      <View style={{ gap: theme.space('space_2') }}>
        <Text testID="wall-recruit-title" role="headline" emphasis="strong" colorToken="text-primary">
          {recruit.title}
        </Text>
        <Text testID="wall-recruit-description" role="body" colorToken="text-secondary">
          {recruit.description}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: theme.space('space_6'),
          rowGap: theme.space('space_2'),
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
