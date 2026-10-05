/**
 * BannerSlot（D24）—— 广告/公告位（组件定义 §2.6；`K19 ImageCarousel` 已并入本组件）
 *
 * 三件事必须做对：
 *   1. **按 `link_type` 分发**（§3.1 已核对的 6 种：`none/shop/product/region/internal/https`），
 *      其中 **`https` 只放行 `https://`** —— 这是安全边界，不是格式偏好；
 *   2. **点击上报**（`onClick(id)`；曝光用 `onImpression(id)`）—— 广告位没有上报等于没有价值；
 *   3. ⚠️ **不展示排期**：后端 `parseBannerBody` **写不进** `starts_at/ends_at`
 *      （调研已确认），所以组件里**没有**任何"活动时间"字段 —— 不确定的信息不显示。
 *
 * 自动轮播的两条约束：
 *   - **只有 1 张时不转**（转起来只会闪）；
 *   - **系统开了"减弱动态效果"时不自动转**（WCAG 2.2.2：要能暂停/停止）——
 *     此时用户仍可手动左右切换。
 * 两者都是 `shouldAutoRotate` 纯函数的输出，可测。
 */

import * as React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/design-system/theme';
import { Pressable } from './Pressable';

export type BannerLinkType = 'none' | 'shop' | 'product' | 'region' | 'internal' | 'https';

export type Banner = {
  id: string | number;
  imageUri: string;
  /** 图片替代文本 / 可读标题（必填：广告图没有替代文本等于对读屏用户不可见） */
  label: string;
  linkType: BannerLinkType;
  /** `https` 时是完整 URL；`internal` 时是以 `/` 开头的路径；实体类时是 id */
  linkValue?: string | null;
};

export type BannerTarget =
  | { kind: 'none' }
  | { kind: 'external'; url: string }
  | { kind: 'internal'; path: string }
  | { kind: 'entity'; entity: 'shop' | 'product' | 'region'; id: string };

/**
 * 解析跳转目标（纯函数，**安全边界就在这里**）。
 * - `https`：**只放行 `https://`**（`http://`、`javascript:`、`data:` 一律拒绝 → `none`）
 * - `internal`：只放行以 `/` 开头的站内路径（⛔ 不放行绝对 URL）
 * - 实体类：交给页面用 `entity + id` 路由（映射表属页面/导航层，不是广告组件的知识）
 */
export function resolveBannerTarget(banner: Pick<Banner, 'linkType' | 'linkValue'>): BannerTarget {
  const value = banner.linkValue?.trim() ?? '';
  switch (banner.linkType) {
    case 'none':
      return { kind: 'none' };
    case 'https':
      return value.toLowerCase().startsWith('https://')
        ? { kind: 'external', url: value }
        : { kind: 'none' };
    case 'internal':
      return value.startsWith('/') && !value.startsWith('//')
        ? { kind: 'internal', path: value }
        : { kind: 'none' };
    case 'shop':
    case 'product':
    case 'region':
      return value === '' ? { kind: 'none' } : { kind: 'entity', entity: banner.linkType, id: value };
    default:
      return { kind: 'none' };
  }
}

/** 是否自动轮播（纯函数）：只有多张、调用方允许、且**系统未开减弱动态**时才转 */
export function shouldAutoRotate(input: {
  count: number;
  autoRotate: boolean;
  reduceMotion: boolean;
}): boolean {
  return input.autoRotate && input.count > 1 && !input.reduceMotion;
}

/** 轮播间隔（毫秒）。⚠️ 这是**时间**不是尺寸，所以不走尺寸令牌；5s 是无障碍建议的常见下限 */
export const BANNER_ROTATE_MS = 5000;

/** 横幅宽高比（**比例是无量纲的**，不引入像素魔法数字；与 `EntityCard` 的媒体区同理） */
export const BANNER_ASPECT_RATIO = 3 / 1;

export type BannerSlotProps = {
  banners: readonly Banner[];
  autoRotate?: boolean;
  onOpen?: (banner: Banner, target: BannerTarget) => void;
  /** 曝光上报（每张成为当前页时一次） */
  onImpression?: (id: Banner['id']) => void;
  /** 点击上报 */
  onClick?: (id: Banner['id']) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BannerSlot({
  banners,
  autoRotate = true,
  onOpen,
  onImpression,
  onClick,
  style,
  testID,
}: BannerSlotProps): React.ReactElement | null {
  const theme = useTheme();
  const [index, setIndex] = React.useState(0);
  // ⚠️ 分页轮播的**每页宽度必须等于容器宽度**，所以只能量出来：
  //    ⛔ 不用 `useWindowDimensions().width`（那会忽略容器内边距与大屏 maxContentWidth，宪法 17）
  const [slideWidth, setSlideWidth] = React.useState(0);
  const rotate = shouldAutoRotate({
    count: banners.length,
    autoRotate,
    reduceMotion: theme.reduceMotion,
  });

  // 自动轮播（`reduceMotion` 时不挂这个定时器）
  React.useEffect(() => {
    if (!rotate) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, BANNER_ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotate, banners.length]);

  // 曝光：当前这一张变化就上报一次（⛔ 不在这里判"是否真的可见"——那要等原生可见性回调）
  const current = banners[index];
  React.useEffect(() => {
    if (current) onImpression?.(current.id);
  }, [current, onImpression]);

  if (banners.length === 0) return null;

  return (
    <View
      testID={testID}
      style={style}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== slideWidth) setSlideWidth(next);
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={banners.length > 1}
        // 手势左右切换是**原生滚动**（⛔ 不自绘手势）
      >
        {banners.map((banner, i) => {
          const target = resolveBannerTarget(banner);
          const openable = target.kind !== 'none';
          return (
            <Pressable
              key={String(banner.id)}
              testID={testID ? `${testID}-${banner.id}` : undefined}
              onPress={
                openable
                  ? () => {
                      onClick?.(banner.id);
                      onOpen?.(banner, target);
                    }
                  : undefined
              }
              disabled={!openable}
              accessibilityRole={openable ? 'button' : 'image'}
              accessibilityLabel={banner.label}
              style={{
                // 每页宽 == 容器宽（量出来的）；高度由**比例**决定
                ...(slideWidth > 0 ? { width: slideWidth } : { flex: 1 }),
                aspectRatio: BANNER_ASPECT_RATIO,
                borderRadius: theme.radius('radius_medium'),
                overflow: 'hidden',
                marginRight: i === banners.length - 1 ? 0 : theme.space('space_2'),
                backgroundColor: theme.color['bg-sunken'].value,
              }}
            >
              <Image
                source={{ uri: banner.imageUri }}
                contentFit="cover"
                style={{ width: '100%', height: '100%' }}
                accessible={false}
                transition={0}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 指示点：**当前页同时有形状与语义**，⛔ 不只靠颜色（2.1.1） */}
      {banners.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.space('space_1'),
            marginTop: theme.space('space_2'),
          }}
        >
          {banners.map((banner, i) => (
            <Pressable
              key={`dot-${String(banner.id)}`}
              onPress={() => setIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={banner.label}
              accessibilityState={{ selected: i === index }}
              style={{
                width: i === index ? theme.space('space_4') : theme.space('space_2'),
                height: theme.space('space_1'),
                borderRadius: theme.radius('radius_full'),
                backgroundColor: theme.color[
                  i === index ? 'action-primary' : 'border-strong'
                ].value,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
