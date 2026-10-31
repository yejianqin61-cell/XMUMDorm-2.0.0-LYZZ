/* eslint-disable react-hooks/immutability -- Reanimated shared values intentionally mutate outside React state. */
/**
 * 树洞媒体：信息流是**无衬底的静态图组**（图本身圆角、cover 填满、无灰边）；
 * 详情是**标准横向 swiper**（一页一张、不循环、首尾弹簧回弹），点图进全屏看图器。
 *
 * 两套画幅是**故意分开**的：信息流按图组规则（单图 75% / 双图各半 / 三图方格），
 * 详情按**首图原始比例**定高（上限宽:高 = 9:16，超长图 cover 裁切），全屏看图器
 * 用 `contain` 看完整图。
 *
 * ⛔ 详情不再有"叠卡"：叠卡会让第 2 张从下方顶上来（所有者 2026-10-31 验收失败截图），
 * 与"横向滑入"是两种语义。切图只做水平位移。
 */

import * as React from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
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
import { TreeholeImageSaveControls, useTreeholeImageSave } from './TreeholeImageSaveControls';
import type { TreeholeImageSaveOptions } from './TreeholeImageSaveControls';
import { getUploadUrl } from '../../../../shared/api/config';

export type TreeholeMediaMode = 'feed' | 'detail';

/** 切页动画时长（只做水平位移，不做缩放/旋转/淡出） */
const PAGE_MS = 220;
/**
 * 首尾继续拖拽的阻尼系数：只跟 30% 的位移。
 * 松手后 `withSpring` 回弹 —— 这就是"到边了，但手感还有弹性"，而不是换页或硬停。
 */
const EDGE_RESISTANCE = 0.3;
const EDGE_SPRING = { damping: 18, stiffness: 260, mass: 0.8 };

/** 拖拽未过阈值时的回弹：阻尼比 ≈0.65，松手后会先冲过一点再回来（弹性） */
const SNAP_SPRING = { damping: 12, stiffness: 220, mass: 0.7 };

/** 全屏看图器下滑关闭阈值 */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.1;

/**
 * 详情轮播比例（宽/高）的**下限**：9:16。
 * 超过这个比例的超长图（长截图 / 超长漫画）在详情页里按 9:16 cover 裁上下，
 * 点进全屏看图器可看完整图。
 */
export const TREEHOLE_DETAIL_MIN_ASPECT = 9 / 16;
/** 首图尺寸还没回来时的占位比例（宽/高 = 4:3，横竖图都不会太离谱） */
export const TREEHOLE_DETAIL_FALLBACK_ASPECT = 4 / 3;

/** 详情首图比例（纯函数）：按原图宽高比，夹到不小于 9:16；拿不到尺寸时用 4:3。 */
export function treeholeDetailAspect(naturalWidth?: number, naturalHeight?: number): number {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return TREEHOLE_DETAIL_FALLBACK_ASPECT;
  }
  return Math.max(naturalWidth / naturalHeight, TREEHOLE_DETAIL_MIN_ASPECT);
}

/** 详情轮播高度（纯函数）：宽度 ÷ 首图比例（比例已夹到 ≥9:16）。 */
export function treeholeDetailHeight(width: number, aspect: number): number {
  if (width <= 0 || aspect <= 0) return 0;
  return Math.round(width / aspect);
}

/** 详情切图阈值（纯函数）：位移 ≥60 或水平速度 ≥700 才换图 */
export function resolveTreeholeSwipe(dx: number, velocityX = 0): 'next' | 'previous' | null {
  if (dx <= -60 || velocityX <= -700) return 'next';
  if (dx >= 60 || velocityX >= 700) return 'previous';
  return null;
}

/**
 * 页码边界（纯函数）：**不循环**。首张再往前 / 末张再往后都停在原地，
 * 由手势层负责弹簧回弹（`resolveTreeholeSwipe` 仍会返回方向，这里把它钳住）。
 */
export function resolveTreeholePage(
  index: number,
  count: number,
  direction: 'next' | 'previous'
): number {
  if (count <= 0) return 0;
  const target = direction === 'next' ? index + 1 : index - 1;
  return Math.min(count - 1, Math.max(0, target));
}

/** 帖子 ID 或图片序列变化时的重置键 */
export function treeholeMediaKey(postId: number, urls: readonly string[]): string {
  return JSON.stringify([postId, urls]);
}

/**
 * 信息流媒体规则（所有者 2026-10-30 指令，**取代** 2026-10-18 的「灰底画框 + contain」）：
 *   · 图**直接贴在帖子底上**：画框不再有 background / padding，灰盒子消失；
 *   · 圆角 `radius_medium` 落在**直接包图的那层**（`overflow: hidden`），裁的是图片像素；
 *   · 图撑满自己的框（`contentFit="cover"`），四周不再露底色；
 *   · 单图：正文列 **75%** 宽、左对齐、高 ≤ **320dp**、宽随原图比例收敛；
 *   · 双图：各占一半、1:1、间距 **8dp**（白缝，不是灰缝）；
 *   · 三图及以上：**3 列方格**、间距 8dp（帖子最多 3 张图，格数正好一行）。
 */
export const TREEHOLE_FEED_MEDIA_WIDTH = '100%';
/** 单图宽度：正文列 75%，左对齐（⛔ 不再居中飘在大画框里） */
export const TREEHOLE_FEED_SINGLE_WIDTH = '75%';
/**
 * 单图宽度比例（量到正文列宽后按像素算）。
 * ⚠️ 为什么不用百分比 + `aspectRatio` 直接排版：2026-10-31 真机实测，
 * `flex: 1 + aspectRatio: 1` 的格子会被 expo-image 的**固有比例**盖回去
 * （双图变成 2.15:1 的扁条、三图高度跟着原图走）——见 `TreeholeFeedMedia` 的注释。
 */
export const TREEHOLE_FEED_SINGLE_WIDTH_RATIO = 0.75;
/** 单图限高：320dp（450dp 以上的宽屏才真正生效） */
export const TREEHOLE_FEED_SINGLE_MAX_HEIGHT = 320;
/**
 * 单图自适应比例区间（宽/高）：竖图最窄 0.72、横图最宽 1.6。
 * 区间外的极端图（长截图 / 全景图）按边界裁切，避免在信息流里变成细高条或超宽条。
 */
export const TREEHOLE_FEED_MIN_ASPECT = 0.72;
export const TREEHOLE_FEED_MAX_ASPECT = 1.6;
/** 拿到原图尺寸前的占位比例（1:1，横图竖图都不偏） */
export const TREEHOLE_FEED_FALLBACK_ASPECT = 1;
/** 三图及以上：3 列方格 */
export const TREEHOLE_FEED_GRID_COLUMNS = 3;

/** 单图比例（纯函数）：按原图宽高比收敛到 [0.72, 1.6]；拿不到尺寸时用 1:1。 */
export function treeholeFeedAspect(naturalWidth?: number, naturalHeight?: number): number {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return TREEHOLE_FEED_FALLBACK_ASPECT;
  }
  const ratio = naturalWidth / naturalHeight;
  return Math.min(TREEHOLE_FEED_MAX_ASPECT, Math.max(TREEHOLE_FEED_MIN_ASPECT, ratio));
}

export function TreeholeMedia({
  postId,
  urls,
  mode,
  imageSave,
}: {
  postId: number;
  urls: readonly string[];
  mode: TreeholeMediaMode;
  imageSave?: TreeholeImageSaveOptions;
}): React.ReactElement | null {
  if (urls.length === 0) return null;
  // posts生产端可能返回本地/uploads路径；展示、预览和保存始终消费同一解析结果。
  const mediaUrls = urls.map(url => url.startsWith('/uploads/') ? getUploadUrl(url) : url);
  return mode === 'feed' ? (
    <TreeholeFeedMedia postId={postId} urls={mediaUrls} />
  ) : (
    <TreeholeDetailMedia key={treeholeMediaKey(postId, mediaUrls)} urls={mediaUrls} imageSave={imageSave} />
  );
}

/**
 * 信息流媒体：**零手势**的静态图组。
 *
 * 单图 / 双图 / 3 列方格的分工写在 `TREEHOLE_FEED_*` 常量上方；这里只负责拼版：
 * 圆角与裁切落在**直接包图**的框上（图本身圆角、无灰边、无衬底），间距一律走间距令牌。
 * 帖子最多 3 张图（后端 `postImagesUpload` 上限 3），≥3 就是一整行方格。
 *
 * ⚠️ **画框尺寸必须自己算，不能只写 `aspectRatio`**（2026-10-31 真机实测）：
 *   格子写 `flex: 1 + aspectRatio: 1` 时，框高会被 expo-image 的**固有比例**撑回去 ——
 *   双图帖子实测成了 427×199（2.15:1 的扁条），三图高度也跟着原图走。
 *   所以这里先量正文列宽（`onLayout`），再给每个框显式的 `width/height`；
 *   量到之前用弹性占位，避免首帧塌成 0。
 */
function TreeholeFeedMedia({
  postId,
  urls,
}: {
  postId: number;
  urls: readonly string[];
}): React.ReactElement {
  const theme = useTheme();
  const gap = theme.space('space_2');
  const radius = theme.radius('radius_medium');
  const [available, setAvailable] = React.useState(0);
  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setAvailable((current) => (current === next ? current : next));
  }, []);

  if (urls.length === 1) {
    return (
      <View
        testID="treehole-media-feed"
        onLayout={handleLayout}
        style={{ width: TREEHOLE_FEED_MEDIA_WIDTH, alignItems: 'flex-start' }}
      >
        {/* key 带 URL：换图 / 回收行时比例状态一起重置 */}
        <TreeholeFeedSingleImage
          key={`${postId}:${urls[0]}`}
          uri={urls[0]}
          radius={radius}
          available={available}
        />
      </View>
    );
  }

  const columns = urls.length === 2 ? 2 : TREEHOLE_FEED_GRID_COLUMNS;
  const cell = available > 0 ? Math.floor((available - gap * (columns - 1)) / columns) : 0;
  const rows: string[][] = [];
  for (let index = 0; index < urls.length; index += columns) {
    rows.push(urls.slice(index, index + columns));
  }

  return (
    <View
      testID="treehole-media-feed"
      onLayout={handleLayout}
      style={{ width: TREEHOLE_FEED_MEDIA_WIDTH, gap }}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={`treehole-media-row-${rowIndex}`}
          testID={rowIndex === 0 ? 'treehole-media-feed-row' : `treehole-media-feed-row-${rowIndex}`}
          style={{ flexDirection: 'row', gap }}
        >
          {row.map((uri, columnIndex) => {
            const index = rowIndex * columns + columnIndex;
            return (
              <View
                key={`${postId}:${index}:${uri}`}
                testID={
                  index === 0 ? 'treehole-media-feed-frame' : `treehole-media-feed-frame-${index}`
                }
                style={[
                  // 未量到列宽前先弹性占位；量到后是**显式正方形**（宽高相等）
                  cell > 0 ? { width: cell, height: cell } : { flex: 1, aspectRatio: 1 },
                  { borderRadius: radius, overflow: 'hidden' },
                ]}
              >
                <TreeholeFeedImage
                  uri={uri}
                  testID={
                    index === 0 ? 'treehole-media-feed-image' : `treehole-media-feed-image-${index}`
                  }
                />
              </View>
            );
          })}
          {/* 末行不足一列时补等宽占位：格子不被拉宽（微信九宫格的同一做法） */}
          {Array.from({ length: columns - row.length }, (_, spacer) => (
            <View
              key={`treehole-media-spacer-${rowIndex}-${spacer}`}
              style={cell > 0 ? { width: cell } : { flex: 1 }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * 单图：正文列 75% 宽、左对齐、限高 320dp，宽随原图比例。
 *
 * 原图尺寸只能等 `onLoad` 才拿到，所以先用 1:1 占位；拿到后收敛到
 * `treeholeFeedAspect`（0.72–1.6），横图变矮、竖图变高，极端比例按边界裁切。
 * 宽度按实测列宽算，高度由比例算出来再夹到 320dp —— 不依赖 `aspectRatio` 与 `maxHeight` 的相互作用。
 */
function TreeholeFeedSingleImage({
  uri,
  radius,
  available,
}: {
  uri: string;
  radius: number;
  available: number;
}): React.ReactElement {
  const [aspect, setAspect] = React.useState(TREEHOLE_FEED_FALLBACK_ASPECT);
  const width =
    available > 0 ? Math.round(available * TREEHOLE_FEED_SINGLE_WIDTH_RATIO) : 0;
  const height =
    width > 0
      ? Math.min(Math.round(width / aspect), TREEHOLE_FEED_SINGLE_MAX_HEIGHT)
      : 0;
  return (
    <View
      testID="treehole-media-feed-frame"
      style={[
        width > 0
          ? { width, height }
          : {
              // 首帧（还没量到列宽）的占位；只活一帧
              width: TREEHOLE_FEED_SINGLE_WIDTH,
              aspectRatio: aspect,
              maxHeight: TREEHOLE_FEED_SINGLE_MAX_HEIGHT,
            },
        { borderRadius: radius, overflow: 'hidden' },
      ]}
    >
      <TreeholeFeedImage
        uri={uri}
        testID="treehole-media-feed-image"
        onLoadSource={(source) => {
          const next = treeholeFeedAspect(source.width, source.height);
          setAspect((current) => (current === next ? current : next));
        }}
      />
    </View>
  );
}

/** 与外层 URL key 一起重置，防止回收行沿用旧图片的失败状态。 */
function TreeholeFeedImage({
  uri,
  testID,
  onLoadSource,
}: {
  uri: string;
  testID: string;
  onLoadSource?: (source: { width?: number; height?: number }) => void;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <View style={{ flex: 1 }}>
      <Image
        testID={testID}
        source={{ uri }}
        recyclingKey={uri}
        cachePolicy="memory-disk"
        // cover：图撑满自己的框，四周不露底色；只对极端比例做边界裁切
        contentFit="cover"
        accessible={false}
        onLoad={(event) => {
          setStatus('loaded');
          // expo-image 给的是扁平事件（`event.source`），不是 RN Image 的 `nativeEvent.source`
          onLoadSource?.(event.source);
        }}
        onError={() => setStatus('failed')}
        style={{ width: '100%', height: '100%' }}
      />
      {status === 'loading' ? (
        <Skeleton testID={`${testID}-loading`} kind="media"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%' }} />
      ) : null}
      {status === 'failed' ? (
        // 失败态才有底色：没有图片像素可看时，文字需要一块能读的底（⛔ 不是常驻画框）
        <View testID={`${testID}-error`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color['bg-sunken'].value }}>
          <Text role="caption" colorToken="text-secondary">{t('screen.campus.mediaFailed')}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 详情：**标准横向 swiper**（一页一张、不循环、首尾弹簧回弹）+ 全屏看图器。
 *
 * 为什么不再叠卡（所有者 2026-10-31 验收截图）：叠卡的后卡从**下方**顶上来，
 * 第 2 张看起来是"上下错开叠放"，与"横向滑入"是两种语义。这里改成一条横向轨道：
 *   - 所有页一次挂载（图片预加载，切换不重挂 → 不闪）；
 *   - 拖动只改 `translateX`，松手后整页滑到目标位；
 *   - 首/末页继续拖只跟 30% 位移，松手 `withSpring` 回弹，⛔ 不循环；
 *   - 页高由**首图**比例决定（上限宽:高 9:16），后续图 `cover` 填满同一框，高度不跳。
 *
 * 全屏看图器同一套横向逻辑 + 下滑关闭（只有竖向位移才关闭，横向位移只翻页）。
 */
type PageStatus = 'loading' | 'loaded' | 'failed';

type PagerPanOptions = {
  count: number;
  width: number;
  /** 当前页（渲染期值；换页后组件重渲染，手势层跟着拿到新值） */
  index: number;
  translateX: SharedValue<number>;
  /** 手势判定要换页时调用；调用方负责提交页码并播放位移动画 */
  onSelect: (index: number) => void;
  reduceMotion: boolean;
  /** 传入即启用竖向手势（仅全屏看图器）：下滑关闭 */
  dismiss?: { translateY: SharedValue<number>; onDismiss: () => void };
};

/**
 * 横向 swiper 的手势层（详情轮播与全屏看图器共用）。
 *
 * 三条约束：
 *   1. **轴锁**：一次手势只认一个方向 —— 横向翻页、竖向关闭，互不抢；
 *   2. **边界阻尼**：首/末页继续拖只跟 30%，松手弹簧回弹（不换页、不循环）；
 *   3. 未过阈值只回弹，不承担"换页动画"（换页由 `onSelect` 统一播）。
 */
function usePagerPan({
  count,
  width,
  index,
  translateX,
  onSelect,
  reduceMotion,
  dismiss,
}: PagerPanOptions): ReturnType<typeof PanResponder.create>['panHandlers'] {
  return React.useMemo(() => {
    /** 本手势实例的轴锁（只活在 create 的闭包里，不进 React state、不用 ref） */
    let axis: 'horizontal' | 'vertical' | null = null;
    /** 在 shouldClaim 时确定方向：grant 时 PanResponder 会把 dx/dy 清零，不能在那里判断 */
    let claimedAxis: 'horizontal' | 'vertical' | null = null;
    /**
     * ⚠️ 必须同时挂 **capture** 版本（2026-10-31）：
     *   图区里的 `Pressable` 会在触摸开始时成为 responder，此时祖先的
     *   `onMoveShouldSetResponder`（冒泡）不会再被询问，只有 capture 会被问；
     *   只写冒泡版 = 在图片上滑不动（只能从图外的空隙滑）。
     */
    const shouldClaim = (gesture: { dx: number; dy: number }): boolean => {
      const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
      const claim = horizontal
        ? count > 1 && Math.abs(gesture.dx) > 12
        : dismiss !== undefined && gesture.dy > 8;
      if (claim) claimedAxis = horizontal ? 'horizontal' : 'vertical';
      return claim;
    };
    return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => shouldClaim(gesture),
        onMoveShouldSetPanResponderCapture: (_, gesture) => shouldClaim(gesture),
        onPanResponderGrant: () => {
          axis = claimedAxis;
        },
        onPanResponderMove: (_, gesture) => {
          if (axis === 'vertical') {
            if (dismiss) dismiss.translateY.value = Math.max(0, gesture.dy);
            return;
          }
          if (count <= 1 || width <= 0) return;
          const base = -index * width;
          const min = -(count - 1) * width;
          let next = base + gesture.dx;
          // 首尾阻尼：只跟 30%，松手回弹（⛔ 不循环到另一端）
          if (next > 0) next *= EDGE_RESISTANCE;
          else if (next < min) next = min + (next - min) * EDGE_RESISTANCE;
          translateX.value = next;
        },
        onPanResponderRelease: (_, gesture) => {
          if (axis === 'vertical') {
            if (!dismiss) return;
            if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
              dismiss.onDismiss();
              return;
            }
            dismiss.translateY.value = reduceMotion ? 0 : withSpring(0, SNAP_SPRING);
            return;
          }
          if (count <= 1 || width <= 0) return;
          const direction = resolveTreeholeSwipe(gesture.dx, gesture.vx * 1000);
          const target =
            direction === null ? index : resolveTreeholePage(index, count, direction);
          if (target !== index) {
            // 换页：由调用方提交页码并播放整页位移（这里不重复做动画）
            onSelect(target);
            return;
          }
          // 未过阈值 / 已经到边：弹簧回中（有回弹手感，画面不切）
          const destination = -index * width;
          translateX.value = reduceMotion
            ? destination
            : withSpring(destination, EDGE_SPRING);
        },
        onPanResponderTerminate: () => {
          if (axis === 'vertical' && dismiss) {
            dismiss.translateY.value = reduceMotion ? 0 : withSpring(0, SNAP_SPRING);
            return;
          }
          if (width > 0) {
            const destination = -index * width;
            translateX.value = reduceMotion
              ? destination
              : withSpring(destination, SNAP_SPRING);
          }
        },
      }).panHandlers;
  }, [count, dismiss, index, onSelect, reduceMotion, translateX, width]);
}

/** 详情媒体：横向轮播 + 计数角标 + 全屏看图器。 */
function TreeholeDetailMedia({
  urls,
  imageSave,
}: {
  urls: readonly string[];
  imageSave?: TreeholeImageSaveOptions;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const radius = theme.radius('radius_medium');

  const [inlineWidth, setInlineWidth] = React.useState(0);
  const inlineWidthRef = React.useRef(0);
  const [firstAspect, setFirstAspect] = React.useState(TREEHOLE_DETAIL_FALLBACK_ASPECT);
  /** index 立即生效；epoch 只在"换页/重试"时递增，用来隔离保存回执（A→B→A 不串） */
  const [nav, setNav] = React.useState({ index: 0, epoch: 0 });
  const { width: windowWidth } = useWindowDimensions();
  const [attempts, setAttempts] = React.useState<Record<number, number>>({});
  const [statusByKey, setStatusByKey] = React.useState<Record<string, PageStatus>>({});
  const [viewerOpen, setViewerOpen] = React.useState(false);

  const inlineX = useSharedValue(0);
  const viewerX = useSharedValue(0);
  const viewerY = useSharedValue(0);

  const activeIndex = nav.index;
  const current = urls[activeIndex] ?? urls[0] ?? '';
  const activeAttempt = attempts[activeIndex] ?? 0;
  const activeStatus = statusByKey[`${activeIndex}:${activeAttempt}`] ?? 'loading';
  const failed = activeStatus === 'failed';
  const detailHeight = treeholeDetailHeight(inlineWidth, firstAspect);

  const saveController = useTreeholeImageSave(
    current,
    JSON.stringify([current, nav.epoch]),
    imageSave?.save
  );

  const commitIndex = React.useCallback(
    (next: number) => {
      setNav((previous) => {
        const target = Math.min(urls.length - 1, Math.max(0, next));
        return target === previous.index
          ? previous
          : { index: target, epoch: previous.epoch + 1 };
      });
    },
    [urls.length]
  );

  /** 详情页内的换页：提交页码 + 横向整页滑动（不缩放、不旋转、不淡出） */
  const selectInline = React.useCallback(
    (next: number) => {
      const target = Math.min(urls.length - 1, Math.max(0, next));
      if (target === nav.index) return;
      commitIndex(target);
      const destination = -target * inlineWidthRef.current;
      inlineX.value = theme.reduceMotion
        ? destination
        : withTiming(destination, { duration: PAGE_MS, easing: Easing.out(Easing.cubic) });
    },
    [commitIndex, inlineX, nav.index, theme.reduceMotion, urls.length]
  );

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.width);
      inlineWidthRef.current = next;
      setInlineWidth((previous) => (previous === next ? previous : next));
      if (next > 0) inlineX.value = -nav.index * next;
    },
    [inlineX, nav.index]
  );

  const recordStatus = React.useCallback((key: string, status: PageStatus) => {
    setStatusByKey((previous) =>
      previous[key] === status ? previous : { ...previous, [key]: status }
    );
  }, []);

  const recordFirstAspect = React.useCallback((source: { width?: number; height?: number }) => {
    const next = treeholeDetailAspect(source.width, source.height);
    setFirstAspect((previous) => (previous === next ? previous : next));
  }, []);

  const retryActive = React.useCallback(() => {
    setAttempts((previous) => ({
      ...previous,
      [activeIndex]: (previous[activeIndex] ?? 0) + 1,
    }));
  }, [activeIndex]);

  /** 打开前先把全屏轨道对齐到当前页（不等弹层首帧，避免打开时闪一下第 1 张） */
  const openViewer = React.useCallback(() => {
    viewerY.value = 0;
    viewerX.value = -nav.index * windowWidth;
    setViewerOpen(true);
  }, [nav.index, viewerX, viewerY, windowWidth]);
  const closeViewer = React.useCallback(() => {
    viewerY.value = 0;
    setViewerOpen(false);
  }, [viewerY]);

  // 全屏看图器里翻页时，详情轨道在弹层下面同步归位（关闭后停在同一张）
  React.useLayoutEffect(() => {
    if (viewerOpen && inlineWidthRef.current > 0) {
      inlineX.value = -nav.index * inlineWidthRef.current;
    }
  }, [inlineX, nav.index, viewerOpen]);

  const inlineTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inlineX.value }],
  }));
  const panHandlers = usePagerPan({
    count: urls.length,
    width: inlineWidth,
    index: nav.index,
    translateX: inlineX,
    onSelect: selectInline,
    reduceMotion: theme.reduceMotion,
  });

  const goByAccessibility = (direction: 'next' | 'previous') =>
    selectInline(resolveTreeholePage(nav.index, urls.length, direction));

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
            onPress={retryActive}
          />
        </View>
      ) : null}

      {/*
        图与正文同栏：容器只有 `width: 100%`，⛔ 没有 background / padding / 灰盒；
        圆角 12 落在**直接包图**的页框上（overflow:hidden 裁的是图片像素）。
      */}
      <View
        testID="treehole-media-carousel"
        onLayout={handleLayout}
        style={[
          { width: '100%', borderRadius: radius },
          inlineWidth > 0
            ? { height: detailHeight, overflow: 'hidden' }
            : { aspectRatio: firstAspect, overflow: 'hidden' },
        ]}
      >
        {urls.length > 0 ? (
          <Animated.View
            testID="treehole-media-track"
            {...panHandlers}
            style={[
              {
                flexDirection: 'row',
                // 首帧还没量到列宽：先让各页等分整栏（只在真实布局前活一帧，测试里也能查到节点）
                width: inlineWidth > 0 ? inlineWidth * urls.length : '100%',
                height: inlineWidth > 0 ? detailHeight : '100%',
              },
              inlineTrackStyle,
            ]}
          >
            {urls.map((uri, pageIndex) => {
              const active = pageIndex === activeIndex;
              const attempt = attempts[pageIndex] ?? 0;
              const statusKey = `${pageIndex}:${attempt}`;
              const status = statusByKey[statusKey] ?? 'loading';
              return (
                <View
                  key={uri}
                  testID={`treehole-media-page-${pageIndex}`}
                  style={{
                    width: inlineWidth > 0 ? inlineWidth : undefined,
                    flex: inlineWidth > 0 ? undefined : 1,
                    height: inlineWidth > 0 ? detailHeight : '100%',
                    borderRadius: radius,
                    overflow: 'hidden',
                  }}
                >
                  <AppPressable
                    testID={active ? 'treehole-media-drag-area' : undefined}
                    onPress={openViewer}
                    accessibilityRole="image"
                    accessibilityLabel={t('screen.campus.mediaPosition', {
                      index: pageIndex + 1,
                      total: urls.length,
                    })}
                    accessibilityElementsHidden={!active}
                    importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
                    // 手势是唯一视觉入口 → 读屏必须另有一条路（到边就停，不循环）
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
                      if (action === 'increment') goByAccessibility('next');
                      else if (action === 'decrement') goByAccessibility('previous');
                    }}
                    contentAlign="stretch"
                    style={{ flex: 1, minHeight: 0 }}
                  >
                    <Image
                      key={`${uri}#${attempt}`}
                      testID={
                        active
                          ? 'treehole-media-detail-image'
                          : `treehole-media-detail-image-${pageIndex}`
                      }
                      source={{ uri }}
                      recyclingKey={uri}
                      cachePolicy="memory-disk"
                      // 详情页按首图比例框定高度，后续图 cover 填满同一框（高度不跳）
                      contentFit="cover"
                      accessible={false}
                      onLoad={(event) => {
                        recordStatus(statusKey, 'loaded');
                        if (pageIndex === 0) recordFirstAspect(event.source);
                      }}
                      onError={() => recordStatus(statusKey, 'failed')}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </AppPressable>
                  {active && status === 'loading' ? (
                    <View
                      pointerEvents="none"
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                      <Skeleton
                        testID="treehole-media-detail-loading"
                        kind="media"
                        style={{ height: '100%' }}
                      />
                    </View>
                  ) : null}
                  {active && status === 'failed' ? (
                    <View
                      testID="treehole-media-detail-error"
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.color['bg-sunken'].value,
                      }}
                    >
                      <Text role="caption" colorToken="text-secondary">
                        {t('screen.campus.mediaFailed')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        {/* 单图不显示角标（2026-10-31：只有 ≥2 张才需要页码） */}
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
              {t('screen.campus.mediaPosition', {
                index: activeIndex + 1,
                total: urls.length,
              })}
            </Text>
          </Surface>
        ) : null}
      </View>

      {imageSave ? (
        <TreeholeImageSaveControls
          options={imageSave}
          controller={saveController}
          testID="treehole-save-detail"
        />
      ) : null}

      <TreeholeImageViewer
        visible={viewerOpen}
        urls={urls}
        index={activeIndex}
        translateX={viewerX}
        translateY={viewerY}
        onSelect={commitIndex}
        onClose={closeViewer}
        imageSave={imageSave}
        controller={saveController}
      />
    </View>
  );
}

/**
 * 全屏看图器：纯图 + 关闭 + 底部计数（⛔ 没有帖子文字、没有评论栏）。
 * 背景与"页面最底"同令牌（亮色近白 / 暗色近黑，统一一套），图 `contain` 撑满宽度并垂直居中。
 */
function TreeholeImageViewer({
  visible,
  urls,
  index,
  translateX,
  translateY,
  onSelect,
  onClose,
  imageSave,
  controller,
}: {
  visible: boolean;
  urls: readonly string[];
  index: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  /** 提交页码（由详情持有，保证关闭后停在当前图） */
  onSelect: (index: number) => void;
  onClose: () => void;
  imageSave?: TreeholeImageSaveOptions;
  controller: ReturnType<typeof useTreeholeImageSave>;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();

  const selectViewer = React.useCallback(
    (next: number) => {
      const target = Math.min(urls.length - 1, Math.max(0, next));
      if (target === index) return;
      onSelect(target);
      const destination = -target * width;
      translateX.value = theme.reduceMotion
        ? destination
        : withTiming(destination, { duration: PAGE_MS, easing: Easing.out(Easing.cubic) });
    },
    [index, onSelect, theme.reduceMotion, translateX, urls.length, width]
  );

  const dismiss = React.useMemo(
    () => ({ translateY, onDismiss: onClose }),
    [onClose, translateY]
  );

  const panHandlers = usePagerPan({
    count: urls.length,
    width,
    index,
    translateX,
    onSelect: selectViewer,
    reduceMotion: theme.reduceMotion,
    dismiss,
  });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - Math.min(0.55, Math.max(0, translateY.value) / 600),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={theme.reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        testID="treehole-media-preview-dialog"
        style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value }}
      >
        <Animated.View style={[{ flex: 1 }, sheetStyle]}>
          <View
            style={{
              paddingTop: theme.space('space_8'),
              paddingHorizontal: theme.space('space_4'),
              alignItems: 'flex-end',
            }}
          >
            <Pressable
              onPress={onClose}
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

          <View {...panHandlers} style={{ flex: 1, overflow: 'hidden' }}>
            <Animated.View
              style={[
                { flexDirection: 'row', width: width * urls.length, height: '100%' },
                trackStyle,
              ]}
            >
              {urls.map((uri, pageIndex) => (
                <View
                  key={uri}
                  testID={`treehole-media-preview-page-${pageIndex}`}
                  style={{ width, height: '100%', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Image
                    testID={
                      pageIndex === index
                        ? 'treehole-media-preview-image'
                        : `treehole-media-preview-image-${pageIndex}`
                    }
                    source={{ uri }}
                    recyclingKey={uri}
                    cachePolicy="memory-disk"
                    // 全屏看完整图：contain（详情页 cover 裁掉的超长图在这里能看全）
                    contentFit="contain"
                    accessible={false}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              ))}
            </Animated.View>
            {/* 盖在图上的一层可读屏元素：整块画面 = 一张图 + 上一张/下一张动作 */}
            <AppPressable
              testID="treehole-media-preview-pager"
              accessibilityRole="image"
              accessibilityLabel={t('screen.campus.mediaPosition', {
                index: index + 1,
                total: urls.length,
              })}
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
                if (action === 'increment') {
                  selectViewer(resolveTreeholePage(index, urls.length, 'next'));
                } else if (action === 'decrement') {
                  selectViewer(resolveTreeholePage(index, urls.length, 'previous'));
                }
              }}
              contentAlign="stretch"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, minHeight: 0 }}
            />
          </View>

          <View
            style={{
              paddingHorizontal: theme.space('space_4'),
              paddingTop: theme.space('space_2'),
              paddingBottom: theme.space('space_4'),
              gap: theme.space('space_2'),
              alignItems: 'center',
            }}
          >
            {imageSave ? (
              <View style={{ alignSelf: 'stretch' }}>
                <TreeholeImageSaveControls
                  options={imageSave}
                  controller={controller}
                  testID="treehole-save-preview"
                />
              </View>
            ) : null}
            {urls.length > 1 ? (
              <Text
                testID="treehole-media-preview-position"
                role="caption"
                colorToken="text-secondary"
                align="center"
                accessibilityLiveRegion="polite"
              >
                {t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
