/* eslint-disable react-hooks/immutability -- Reanimated shared values intentionally mutate outside React state. */
/** 树洞媒体：信息流静态预览；详情复用叠卡、切图与预览。Stage 2 使用完整等比画面和稳定占位。 */

import * as React from 'react';
import { Modal, PanResponder, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import X from 'lucide-react-native/icons/x';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pressable as AppPressable } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

export type TreeholeMediaMode = 'feed' | 'detail';

/** 详情叠卡最多同时渲染几张（前卡 + 两张后卡） */
export const TREEHOLE_DECK_MAX_LAYERS = 3;

/** 叠卡层数（纯函数）：1 张图没有后卡，2 张图只叠一层，3 张及以上叠满三层 */
export function treeholeDeckLayers(count: number): number {
  if (count <= 0) return 0;
  return Math.min(TREEHOLE_DECK_MAX_LAYERS, count);
}

/**
 * 后卡的景深参数：第二层缩放 0.95、右上偏移 12 / 6、逆时针 1.5°；
 * 第三层 0.89、24 / 12、3°。切图时这些值线性收敛到 0（后卡上浮成前卡）。
 */
const DECK_SECOND = { scale: 0.95, x: 12, y: -6, rotate: -1.5 } as const;
const DECK_THIRD = { scale: 0.89, x: 24, y: -12, rotate: -3 } as const;
/** 前卡飞出的距离（占卡片宽度比例）、上移量与旋转上限 */
const FLY_RATIO = 0.5;
const FLY_UP = 40;
const FLY_ROTATE_DIVISOR = 14;
/** 后卡露边需要的顶部/右侧留白（不让叠层压到标题或右边界） */
const DECK_TOP_PADDING = 16;
const DECK_RIGHT_PADDING = 6;
/**
 * 前卡飞出 / 后卡上浮：**带过冲的缓动**（`Easing.back`）而不是线性 timing ——
 * 后卡会先冲过落点一点点再回来，这就是"弹性"的观感。
 *
 * ⚠️ 为什么不用 `withSpring` 承担整段位移（2026-10-18 实测）：
 *   ① `damping:18 / stiffness:260` 要 ~0.7s 才 finished，期间"后卡已经顶到前层、计数还是旧值"；
 *   ② 更关键的是 **Jest 里 spring 的完成回调不触发**，换图永远提交不了 —— 动画实现不能只靠
 *   真机才能跑通的那条路径。回弹（拖拽松手）仍走 `withSpring`，它不依赖完成回调。
 */
const FLY_MS = 260;
const FLY_EASING = Easing.out(Easing.back(1.3));
/** 拖拽未过阈值时的回弹：阻尼比 ≈0.65，松手后会先冲过一点再回来（弹性） */
const SNAP_SPRING = { damping: 12, stiffness: 220, mass: 0.7 };

/** 详情切图阈值（纯函数）：位移 ≥60 或水平速度 ≥700 才换图 */
export function resolveTreeholeSwipe(dx: number, velocityX = 0): 'next' | 'previous' | null {
  if (dx <= -60 || velocityX <= -700) return 'next';
  if (dx >= 60 || velocityX >= 700) return 'previous';
  return null;
}

/** 帖子 ID 或图片序列变化时的重置键 */
export function treeholeMediaKey(postId: number, urls: readonly string[]): string {
  return `${postId}:${urls.join('|')}`;
}

/** 稳定媒体画框；contain 保留原图比例，网络加载不改变列表行高。 */
export function treeholeMediaAspect(count: number, mode: TreeholeMediaMode = 'feed'): number {
  if (mode === 'detail') return 16 / 9;
  return 4 / 3;
}

/** 媒体占满同一正文列；不按一屏两篇反推行高。 */
export const TREEHOLE_FEED_MEDIA_WIDTH = '100%';
export const TREEHOLE_FEED_MULTI_MEDIA_WIDTH = '100%';

export function TreeholeMedia({
  postId,
  urls,
  mode,
}: {
  postId: number;
  urls: readonly string[];
  mode: TreeholeMediaMode;
}): React.ReactElement | null {
  if (urls.length === 0) return null;
  return mode === 'feed' ? (
    <TreeholeFeedMedia postId={postId} urls={urls} />
  ) : (
    <TreeholeDetailMedia postId={postId} urls={urls} />
  );
}

function CountBadge({ label }: { label: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <Surface
      variant="surface"
      rounded="radius_full"
      padding="space_1"
      style={{
        position: 'absolute',
        right: theme.space('space_2'),
        bottom: theme.space('space_2'),
      }}
    >
      <Text role="caption" colorToken="text-secondary" testID="treehole-media-count">
        {label}
      </Text>
    </Surface>
  );
}

/** feed 只保留图片状态，不注册手势；错误后点整块进入详情重试。 */
function TreeholeFeedMedia({
  postId,
  urls,
}: {
  postId: number;
  urls: readonly string[];
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const multi = urls.length > 1;
  // 第三张起省略：信息流只展示前两张
  const visible = urls.slice(0, 2);
  const width = multi ? TREEHOLE_FEED_MULTI_MEDIA_WIDTH : TREEHOLE_FEED_MEDIA_WIDTH;
  return (
    <View testID="treehole-media-feed" style={{ width }}>
      <View style={{ flexDirection: 'row', gap: theme.space('space_1') }}>
        {visible.map((uri, index) => (
          <View
            key={`${postId}:${index}:${uri}`}
            style={{
              flex: 1,
              aspectRatio: treeholeMediaAspect(urls.length),
              borderRadius: theme.radius('radius_medium'),
              overflow: 'hidden',
              backgroundColor: theme.color['bg-sunken'].value,
            }}
          >
            <TreeholeFeedImage
              uri={uri}
              testID={index === 0 ? 'treehole-media-feed-image' : `treehole-media-feed-image-${index}`}
            />
          </View>
        ))}
      </View>
      {urls.length > 2 ? (
        <CountBadge label={t('screen.campus.mediaCount', { count: urls.length })} />
      ) : null}
    </View>
  );
}

/** 与外层 URL key 一起重置，防止回收行沿用旧图片的失败状态。 */
function TreeholeFeedImage({ uri, testID }: { uri: string; testID: string }): React.ReactElement {
  const { t } = useI18n();
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <View style={{ flex: 1 }}>
      <Image
        testID={testID}
        source={{ uri }}
        recyclingKey={uri}
        cachePolicy="memory-disk"
        contentFit="contain"
        accessible={false}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
        style={{ width: '100%', height: '100%' }}
      />
      {status === 'loading' ? (
        <Skeleton testID={`${testID}-loading`} kind="media"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%' }} />
      ) : null}
      {status === 'failed' ? (
        <View testID={`${testID}-error`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' }}>
          <Text role="caption" colorToken="text-secondary">{t('screen.campus.mediaFailed')}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 详情：**16:9 画幅的叠卡**（前卡 + 后卡若干层）+ **只用手势切图** + 预览。
 *
 * 动画模型（一套共享值驱动三层，避免"每层各写一套动画"）：
 *   - `dragX / dragY`：手指拖动量（只作用于前卡，后卡不动）；
 *   - `exit` 0→1：切图进度。前卡沿方向飞出并淡出；第二层收敛到 0（变成前卡），
 *     第三层收敛到第二层的位置。`exit = 1` 时后卡已经就位，此时换 index 并清零共享值，
 *     画面**在数学上连续**（旧第二层在 exit=1 的样子 = 新前卡在 exit=0 的样子）。
 *   - 释放未过阈值 → 弹簧回中（有回弹）；过阈值 → 弹簧飞出（不是线性 timing），
 *     这就是所有者要的"弹性动效"。
 */
function TreeholeDetailMedia({
  postId,
  urls,
}: {
  postId: number;
  urls: readonly string[];
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  /** 当前前卡（已提交）。飞出动画期间不变，动画结束才前进 */
  const [index, setIndex] = React.useState(0);
  /**
   * 计数/读屏用的**目标序号**：手势松开（判定换图）的那一刻就前进，不等动画落位。
   * 为什么：飞出动画里"后卡已经顶到前层"的那 200ms 里，用户看到的是下一张图，
   * 如果计数还停在旧值就是"图已经换了、字还没换"。
   */
  const [labelIndex, setLabelIndex] = React.useState(0);
  /**
   * 过渡方向：决定**后卡显示哪一张**。
   * - `next`：后卡 = 下一张（叠卡的天然方向）；
   * - `previous`：后卡 = 上一张（第二层）+ 当前前卡（第三层）。
   *   ⚠️ 第三层放"当前前卡"是为了落位后第二层正好接上它（否则最深那层会闪一下别的图）。
   */
  const [pendingDirection, setPendingDirection] = React.useState<'next' | 'previous' | null>(null);
  const labelRef = React.useRef(0);
  const targetRef = React.useRef(0);
  /** 连点保护：只让**最后一次**动画的完成回调提交 index */
  const flightToken = React.useRef(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [loadedUri, setLoadedUri] = React.useState<string | null>(null);
  const [retryRevision, setRetryRevision] = React.useState(0);
  // 叠卡要按卡片宽度计算飞出距离，所以得知道画幅的实际像素宽
  const [mediaWidth, setMediaWidth] = React.useState(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const exit = useSharedValue(0);
  /** 飞出方向：-1 = 下一张（向左飞出），1 = 上一张（向右飞出） */
  const flyDirection = useSharedValue(1);
  const key = treeholeMediaKey(postId, urls);
  const layers = treeholeDeckLayers(urls.length);
  const current = urls[index] ?? urls[0];
  const travel = mediaWidth > 0 ? mediaWidth : 320;
  const at = (offset: number) => urls[((offset % urls.length) + urls.length) % urls.length];
  // 后卡内容：next → 下一张 / 再下一张；previous → 上一张 / 当前前卡（见 pendingDirection 注释）
  const secondUri = pendingDirection === 'previous' ? at(index - 1) : at(index + 1);
  const thirdUri = pendingDirection === 'previous' ? at(index) : at(index + 2);

  /** 动画结束后提交：index 追到目标，后卡回到"下一张"序列 */
  const commit = React.useCallback((token: number) => {
    if (token !== flightToken.current) return;
    setPendingDirection(null);
    setIndex(targetRef.current);
  }, []);

  /**
   * 统一换图路径（**手势拖动**与**读屏动作**共用）：前卡按方向飞出、后卡弹性上浮，落位后换图。
   * reduced-motion 时直接换图（不飞、不转、不淡出）。
   */
  const fly = React.useCallback(
    (direction: 'next' | 'previous') => {
      if (urls.length <= 1) return;
      const from = labelRef.current;
      const target =
        direction === 'next' ? (from + 1) % urls.length : (from - 1 + urls.length) % urls.length;
      labelRef.current = target;
      targetRef.current = target;
      setLabelIndex(target);
      if (theme.reduceMotion) {
        dragX.value = 0;
        dragY.value = 0;
        exit.value = 0;
        setPendingDirection(null);
        setIndex(target);
        return;
      }
      setPendingDirection(direction);
      flyDirection.value = direction === 'next' ? -1 : 1;
      const token = ++flightToken.current;
      exit.value = withTiming(1, { duration: FLY_MS, easing: FLY_EASING }, (finished) => {
        if (finished) runOnJS(commit)(token);
      });
    },
    [commit, dragX, dragY, exit, flyDirection, theme.reduceMotion, urls.length]
  );

  // 换图提交后清零共享值：此刻新前卡在 exit=0 的样子与旧第二层在 exit=1 的样子一致，
  // 所以这一帧前后画面连续（不会出现"闪回原位"）。
  // ⚠️ layout-effect 而不是普通 effect：它在画面刷出**之前**跑，避免看到一帧"旧前卡又回来"。
  React.useLayoutEffect(() => {
    if (exit.value !== 1) return;
    dragX.value = 0;
    dragY.value = 0;
    exit.value = 0;
  }, [dragX, dragY, exit, index]);

  React.useEffect(() => {
    setIndex(0);
    setLabelIndex(0);
    labelRef.current = 0;
    targetRef.current = 0;
    flightToken.current++;
    setPendingDirection(null);
    setPreviewOpen(false);
    setFailed(false);
    setLoadedUri(null);
    dragX.value = 0;
    dragY.value = 0;
    exit.value = 0;
  }, [key, dragX, dragY, exit]);

  const snapBack = React.useCallback(() => {
    if (theme.reduceMotion) {
      dragX.value = 0;
      dragY.value = 0;
      return;
    }
    dragX.value = withSpring(0, SNAP_SPRING);
    dragY.value = withSpring(0, SNAP_SPRING);
  }, [dragX, dragY, theme.reduceMotion]);

  const panHandlers = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          urls.length > 1 && Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 12,
        onPanResponderMove: (_, gesture) => {
          dragX.value = gesture.dx;
          // 竖向只跟一点点：横向拖拽仍是主语义，竖向留给页面滚动
          dragY.value = gesture.dy * 0.25;
        },
        onPanResponderRelease: (_, gesture) => {
          const direction = resolveTreeholeSwipe(gesture.dx, gesture.vx * 1000);
          if (direction === null) snapBack();
          else fly(direction);
        },
        onPanResponderTerminate: snapBack,
      }).panHandlers,
    [dragX, dragY, fly, snapBack, urls.length]
  );

  const frontStyle = useAnimatedStyle(() => {
    const offset = dragX.value + flyDirection.value * exit.value * travel * FLY_RATIO;
    return {
      transform: [
        { translateX: offset },
        { translateY: dragY.value - exit.value * FLY_UP },
        { rotate: `${offset / FLY_ROTATE_DIVISOR}deg` },
      ],
      // Easing.back 会过冲到 >1；透明度必须夹住（负数会被 RN 当成 0，但显式写出来更清楚）
      opacity: Math.max(0, 1 - exit.value),
    };
  });
  const secondStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: DECK_SECOND.x * (1 - exit.value) },
      { translateY: DECK_SECOND.y * (1 - exit.value) },
      { rotate: `${DECK_SECOND.rotate * (1 - exit.value)}deg` },
      { scale: DECK_SECOND.scale + (1 - DECK_SECOND.scale) * exit.value },
    ],
    opacity: 1,
  }));
  const thirdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: DECK_THIRD.x * (1 - exit.value) },
      { translateY: DECK_THIRD.y * (1 - exit.value) },
      { rotate: `${DECK_THIRD.rotate * (1 - exit.value)}deg` },
      {
        scale: DECK_THIRD.scale + (DECK_SECOND.scale - DECK_THIRD.scale) * exit.value,
      },
    ],
    opacity: 1,
  }));

  /** 后卡：只负责景深暗示；读屏忽略（前卡已经报了"第几张"） */
  const backCard = (
    uri: string,
    style: ReturnType<typeof useAnimatedStyle>,
    testID: string
  ): React.ReactElement => (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: theme.radius('radius_medium'),
          overflow: 'hidden',
          backgroundColor: theme.color['bg-sunken'].value,
        },
        // Reanimated 的 style handle 与 Animated.View 的样式入参在 TS 里不是同一支类型，
        // 但运行期它就是合法的 animated style —— 这里只做类型对齐，不改变行为。
        style as never,
      ]}
    >
      <Image
        source={{ uri }}
        recyclingKey={uri}
        cachePolicy="memory-disk"
        contentFit="contain"
        accessible={false}
        style={{ width: '100%', height: '100%' }}
      />
    </Animated.View>
  );

  return (
    <View testID="treehole-media-detail" style={{ gap: theme.space('space_2') }}>
      {failed ? (
        <View testID="treehole-media-error" style={{ gap: theme.space('space_2') }}>
          <Text role="body" colorToken="text-secondary">
            {t('screen.campus.mediaFailed')}
          </Text>
          <Button
            testID="treehole-media-retry"
            label={t('action.retry')}
            size="small"
            variant="secondary"
            onPress={() => {
              setFailed(false);
              setLoadedUri(null);
              setRetryRevision((value) => value + 1);
            }}
          />
        </View>
      ) : (
        // 外层留出后卡露边：⛔ 不裁切（裁掉就看不见"多张堆叠"了）
        <View
          testID="treehole-media-box"
          style={{ paddingTop: DECK_TOP_PADDING, paddingRight: DECK_RIGHT_PADDING }}
        >
          <View
            style={{ aspectRatio: treeholeMediaAspect(urls.length, 'detail') }}
            onLayout={(event) => setMediaWidth(event.nativeEvent.layout.width)}
          >
            {layers >= 3 ? backCard(thirdUri, thirdStyle, 'treehole-media-back-2') : null}
            {layers >= 2 ? backCard(secondUri, secondStyle, 'treehole-media-back-1') : null}

            <Animated.View
              style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, frontStyle]}
              {...panHandlers}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: theme.radius('radius_medium'),
                  overflow: 'hidden',
                  backgroundColor: theme.color['bg-sunken'].value,
                }}
              >
                <AppPressable
                  testID="treehole-media-drag-area"
                  onPress={() => setPreviewOpen(true)}
                  accessibilityRole="image"
                  accessibilityLabel={t('screen.campus.mediaPosition', {
                    index: labelIndex + 1,
                    total: urls.length,
                  })}
                  // 2026-10-18 第六轮：箭头删除后，**手势是唯一的视觉入口** → 读屏必须另有一条路
                  accessibilityActions={
                    urls.length > 1
                      ? [
                          { name: 'increment', label: t('screen.campus.mediaNext') },
                          { name: 'decrement', label: t('screen.campus.mediaPrevious') },
                        ]
                      : undefined
                  }
                  onAccessibilityAction={(event) => {
                    const action = event.nativeEvent.actionName;
                    if (action === 'increment') fly('next');
                    else if (action === 'decrement') fly('previous');
                  }}
                  contentAlign="stretch"
                  style={{ flex: 1 }}
                >
                  <Image
                    key={`${current}:${retryRevision}`}
                    testID="treehole-media-detail-image"
                    source={{ uri: current }}
                    recyclingKey={current}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    accessible={false}
                    onLoad={() => setLoadedUri(current)}
                    onError={() => setFailed(true)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </AppPressable>
                {loadedUri !== current ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Skeleton testID="treehole-media-detail-loading" kind="media" style={{ height: '100%' }} />
                  </View>
                ) : null}
              </View>
            </Animated.View>

            {/* 只剩右下角计数：左右箭头已按所有者第六轮要求删除，切图只走手势
                （读屏走 drag-area 的 accessibilityActions） */}
            {urls.length > 1 ? (
              <Surface
                variant="surface"
                rounded="radius_full"
                padding="space_1"
                style={{
                  position: 'absolute',
                  right: theme.space('space_2'),
                  bottom: theme.space('space_2'),
                  opacity: 0.92,
                }}
              >
                <Text
                  testID="treehole-media-position"
                  role="caption"
                  colorToken="text-secondary"
                  accessibilityLiveRegion="polite"
                >
                  {t('screen.campus.mediaPosition', { index: labelIndex + 1, total: urls.length })}
                </Text>
              </Surface>
            ) : null}
          </View>
        </View>
      )}

      <Modal
        visible={previewOpen}
        transparent
        animationType={theme.reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View
          testID="treehole-media-preview-dialog"
          style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value }}
        >
          <View
            style={{
              paddingTop: theme.space('space_8'),
              paddingHorizontal: theme.space('space_4'),
              alignItems: 'flex-end',
            }}
          >
            <Pressable
              onPress={() => setPreviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('action.close')}
              style={{
                minWidth: theme.touchTarget,
                minHeight: theme.touchTarget,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={X} size="body" tint="primary" />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Image
              testID="treehole-media-preview-image"
              source={{ uri: current }}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          {urls.length > 1 ? (
            <View style={{ padding: theme.space('space_4'), alignItems: 'center' }}>
              <Text role="caption" colorToken="text-secondary">
                {t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
