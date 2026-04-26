/**
 * 玻璃卡片内顶部：大号 XMUMDorm 标题条（卡通在 LoginCard 外单独展示）
 * @param {string} [title] 主标题，默认 XMUMDorm
 * @param {boolean} [compact] 缩小标题与留白（注册页一屏）
 */
export default function AuthCardBrandHeader({ title = 'XMUMDorm', compact = false }) {
  return (
    <div className={`${compact ? 'mb-3' : 'mb-4'} flex flex-col items-center`}>
      <h1 className={`${compact ? 'text-2xl' : 'text-[28px]'} font-semibold tracking-tight text-slate-900`}>
        {title}
      </h1>
    </div>
  );
}
