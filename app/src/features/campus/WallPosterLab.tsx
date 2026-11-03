/**
 * WallPosterLab —— 文字海报的**实机视觉实验页**（阶段 2 · 节点 A）
 *
 * 为什么存在：五种模板的差异（底色 / 字号 / 对齐 / 留白 / 卡片高度）只能在真机上判断，
 * 静态截图说明不了"连续信息流里好不好看"。本页把同一段文字放进不同模板反复看：
 *
 *   1. 样本切换（超短 / 短 / 中 / 长 / 英文 / 中英 / 多段 / Emoji）；
 *   2. 「自动推荐」给出 2–3 个有效候选，可点选切换；
 *   3. 「换一批」优先换掉当前候选，而不是原样重摇；
 *   4. 「全部模板」逐张展示 A–E，并标出该长度下是否推荐。
 *
 * 边界：
 *   · 只读静态样本，⛔ 不联网、不写库、不接发布流程（那是节点 B）；
 *   · 用**与信息流相同的卡壳 + 同一个 `WallPosterBody`**，⛔ 不复制一套预览样式；
 *   · 入口挂在万能墙示例条上（同样在节点 B 随示例流一起删除）。
 */

import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { WallPostCard } from './WallPostCard';
import {
  generateWallPosterCandidates,
  rankWallPosterTemplates,
  wallPosterSeed,
  type WallPosterCandidate,
} from './wallPosterLayout';
import {
  WALL_POSTER_TEMPLATE_LIST,
  wallPosterTemplate,
  type WallPosterTemplateId,
} from './wallPosterTemplates';
import {
  WALL_POSTER_LAB_CASES,
  wallPosterLabCase,
  type WallPosterLabCaseKey,
} from './wallPosterLabCases';
import type { WallPost } from './wallPost';

const DEFAULT_CASE: WallPosterLabCaseKey = 'shortZh';
/** 示例帖 id 取 990000+ 保留段：与真实 id（自增）和阶段 1 示例（900000）都不冲突 */
const LAB_POST_ID_BASE = 990000;

type LabState = {
  caseKey: WallPosterLabCaseKey;
  batch: readonly WallPosterCandidate[];
  selected: WallPosterTemplateId;
  round: number;
};

function buildLabState(
  caseKey: WallPosterLabCaseKey,
  round: number,
  exclude: readonly WallPosterTemplateId[]
): LabState {
  const content = wallPosterLabCase(caseKey).content;
  const batch = generateWallPosterCandidates(content, {
    seed: (wallPosterSeed(content) + round * 7919) >>> 0,
    exclude,
  });
  return {
    caseKey,
    batch,
    selected: batch[0]?.templateId ?? 'plainEssay',
    round,
  };
}

/** 预览用帖子：只负责把正文 + 模板塞进与信息流相同的外壳 */
function labPost(content: string, templateId: WallPosterTemplateId, slot: number): WallPost {
  return {
    id: LAB_POST_ID_BASE + slot,
    kind: 'free',
    content,
    posterTemplateId: templateId,
    likeCount: 0,
    commentCount: 0,
  };
}

export function WallPosterLab(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const [state, setState] = React.useState<LabState>(() => buildLabState(DEFAULT_CASE, 0, []));

  const content = wallPosterLabCase(state.caseKey).content;
  const evaluations = React.useMemo(
    () => new Map(rankWallPosterTemplates(content).map((item) => [item.templateId, item])),
    [content]
  );

  // 实验页可能由深链直接打开：没有返回栈时回万能墙，⛔ 不留空白页
  const back = React.useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/?tab=wall' as never);
  }, [router]);

  return (
    <Screen
      testID="wall-poster-lab"
      scroll
      header={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_2'),
            paddingHorizontal: theme.space('space_2'),
            paddingBottom: theme.space('space_2'),
          }}
        >
          <IconButton
            testID="wall-poster-lab-back"
            Icon={ArrowLeft}
            accessibilityLabel={t('action.back')}
            onPress={back}
          />
          <Text role="headline" emphasis="strong">
            {t('wall.poster.lab.title')}
          </Text>
        </View>
      }
    >
      <View
        style={{
          paddingTop: theme.space('space_2'),
          paddingBottom: theme.space('space_12'),
          gap: theme.space('space_3'),
        }}
      >
        {/*
          * 卡片**不额外加水平内边距**：`WallPostCard` 自己带 16 卡片外边距，
          * 与信息流等宽，预览的换行位置才和首页一致。
          */}
        <View style={{ paddingHorizontal: theme.space('space_4'), gap: theme.space('space_3') }}>
          <Text role="caption" colorToken="text-muted">
            {t('wall.poster.lab.sample')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.space('space_2') }}
          >
            {WALL_POSTER_LAB_CASES.map((item) => (
              <Chip
                key={item.key}
                testID={`wall-poster-case-${item.key}`}
                variant="selectable"
                selected={state.caseKey === item.key}
                label={t(item.labelKey)}
                onPress={() => setState(buildLabState(item.key, 0, []))}
              />
            ))}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.space('space_2'),
            }}
          >
            <Text role="label" emphasis="strong">
              {t('wall.poster.lab.candidates')}
            </Text>
            <Button
              testID="wall-poster-reroll"
              variant="secondary"
              size="small"
              label={t('wall.poster.lab.reroll')}
              onPress={() =>
                setState((current) =>
                  buildLabState(
                    current.caseKey,
                    current.round + 1,
                    current.batch.map((item) => item.templateId)
                  )
                )
              }
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.space('space_2'),
            }}
          >
            {state.batch.map((candidate) => (
              <Chip
                key={candidate.templateId}
                testID={`wall-poster-candidate-${candidate.templateId}`}
                variant="selectable"
                selected={state.selected === candidate.templateId}
                label={t(wallPosterTemplate(candidate.templateId).nameKey)}
                onPress={() =>
                  setState((current) => ({ ...current, selected: candidate.templateId }))
                }
              />
            ))}
          </View>
        </View>

        <WallPostCard post={labPost(content, state.selected, 1)} allowFallback={false} />

        <View style={{ paddingHorizontal: theme.space('space_4') }}>
          <Divider />
        </View>

        <Text role="label" emphasis="strong" style={{ paddingHorizontal: theme.space('space_4') }}>
          {t('wall.poster.lab.all')}
        </Text>

        {WALL_POSTER_TEMPLATE_LIST.map((template, index) => {
          const evaluation = evaluations.get(template.id);
          return (
            <View key={template.id} style={{ gap: theme.space('space_1') }}>
              <WallPostCard
                post={labPost(content, template.id, index + 10)}
                allowFallback={false}
              />
              <Text
                role="caption"
                colorToken="text-muted"
                style={{ paddingHorizontal: theme.space('space_4') }}
              >
                {`${t(template.nameKey)} · ${
                  evaluation?.eligible
                    ? t('wall.poster.lab.fit')
                    : t('wall.poster.lab.unfit')
                }`}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
