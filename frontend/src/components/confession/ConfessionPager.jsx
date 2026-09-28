/**
 * 万能墙纵向翻页轨道 — M09
 *
 * 设计文档 §7.4。沿用仓库既有的 translate 手法（见 components/Layout.jsx 的
 * .tab-stack-track），但改为纵向。
 *
 * 几何约定（与 ConfessionWall.css 中的 `.cf-pager__viewport` 高度严格配套）：
 *   viewport 为确定高度 H（--cf-pager-height）；
 *   track 通过 `translateY(calc(-index * H))` 位移；
 *   每个 pane 绝对定位在 `top: calc(i * H)`，**并通过 height 显式设为 H**。
 * 用确定高度而非百分比，是为了避开「父高由 min-height 决定时百分比高度退化为 auto」
 * 的 CSS 陷阱——那会导致单个 pane 撑满整条 track。
 * 同理 pane 必须显式给 height：否则 pane 高度退化为内容高度，卡片里的 `min-height: 100%`
 * 失去参照，一张卡片撑不满一屏（V1.1 修复）。
 *
 * 布局顺序（V1.1）：控制条与边界提示都在视口**上方**。88vh 的一屏一篇必然让页面可滚动，
 * 控制条若留在视口下方会落到折叠线以外，用户看不到翻页按钮；两个翻页按钮分别贴左右两端。
 *
 * 无障碍：容器 role=region，翻页按钮为真实 button（键盘与鼠标等价），
 * 当前篇通过 aria-live 播报。
 */
import { useLanguage } from '../../context/LanguageContext';

/** 与 CSS 中 --cf-pager-height 保持一致，供内联样式计算位移 */
export const PAGER_PANE_HEIGHT = 'var(--cf-pager-height, 88vh)';

function ChevronUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * @param {Object} props
 * @param {Array} props.items - 窗口内的帖子（新 → 旧）
 * @param {number} props.index - 当前展示下标
 * @param {Function} props.renderCard - (item, isActive) => ReactNode
 * @param {Function} [props.onPrev] - 上翻（更新）
 * @param {Function} [props.onNext] - 下翻（更旧）
 * @param {Function} [props.onFirst]
 * @param {Function} [props.onLast]
 * @param {boolean} props.canPrev
 * @param {boolean} props.canNext
 * @param {boolean} [props.atNewestEdge] - 已在最新一篇（含「无更多」提示）
 * @param {boolean} [props.atOldestEdge] - 已在最旧一篇
 * @param {number} [props.positionNumber] - 绝对序号（第 n 篇）
 * @param {number} [props.total]
 */
export default function ConfessionPager({
  items,
  index,
  renderCard,
  onPrev,
  onNext,
  onFirst,
  onLast,
  canPrev,
  canNext,
  atNewestEdge = false,
  atOldestEdge = false,
  positionNumber = 1,
  total = 0,
}) {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const count = items.length;

  return (
    <div className="cf-pager">
      {/*
        控制条放在视口**上方**：一屏一篇的高度是 88vh，控制条若留在视口下方，
        在常见屏幕上会落到折叠线以下（1440×900 实测：视口底部 y=1058，控制条 y=1070），
        用户看不到也点不到翻页按钮。两个翻页按钮分别贴到左右两端。
      */}
      <div className="cf-pager__controls">
        <button
          type="button"
          className="cf-pager__btn cf-pager__btn--prev"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label={isZh ? '上篇（更新）' : 'Previous (newer)'}
          title={isZh ? '上篇 ↑' : 'Previous ↑'}
        >
          <ChevronUpIcon />
        </button>

        <div className="cf-pager__center">
          <div className="cf-pager__position" aria-live="polite" aria-atomic="true">
            <strong>{positionNumber}</strong>
            <span className="cf-pager__position-sep">/</span>
            <span>{total > 0 ? total : count}</span>
          </div>

          {(onFirst || onLast) && (
            <div className="cf-pager__jumps">
              <button type="button" className="cf-pager__jump" onClick={onFirst} disabled={!canPrev}>
                {isZh ? '最新' : 'Newest'}
              </button>
              <button type="button" className="cf-pager__jump" onClick={onLast} disabled={!canNext}>
                {isZh ? '最旧' : 'Oldest'}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="cf-pager__btn cf-pager__btn--next"
          onClick={onNext}
          disabled={!canNext}
          aria-label={isZh ? '下篇（更旧）' : 'Next (older)'}
          title={isZh ? '下篇 ↓' : 'Next ↓'}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {atNewestEdge && (
        <p className="cf-pager__hint" role="status">
          {isZh ? '已经是最新一篇了' : 'This is the newest confession'}
        </p>
      )}
      {atOldestEdge && (
        <p className="cf-pager__hint" role="status">
          {isZh ? '已经是最旧一篇了' : 'This is the oldest confession'}
        </p>
      )}

      <div className="cf-pager__viewport" role="region" aria-label={isZh ? '万能墙' : 'Confession Wall'}>
        <div
          className="cf-pager__track"
          style={{ transform: `translateY(calc(-1 * ${index} * ${PAGER_PANE_HEIGHT}))` }}
        >
          {items.map((item, i) => (
            <div
              className="cf-pager__pane"
              key={item.id}
              data-active={i === index}
              aria-hidden={i !== index}
              style={{ top: `calc(${i} * ${PAGER_PANE_HEIGHT})` }}
            >
              {renderCard(item, i === index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
