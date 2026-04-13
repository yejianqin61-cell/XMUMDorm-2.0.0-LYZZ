/**
 * 玻璃卡片内顶部：大号 XMUMDorm 标题条（卡通在 LoginCard 外单独展示）
 * @param {string} [title] 主标题，默认 XMUMDorm
 */
export default function AuthCardBrandHeader({ title = 'XMUMDorm' }) {
  return (
    <div className="mb-4 flex justify-center px-1 sm:mb-5">
      <div className="rounded-[1.35rem] border-2 border-sky-100/90 bg-sky-200/95 px-10 py-4 shadow-xl shadow-teal-950/20 sm:px-14 sm:py-5">
        <span className="text-[1.85rem] font-extrabold tracking-tight text-zinc-900 sm:text-[2.35rem] sm:tracking-tighter">
          {title}
        </span>
      </div>
    </div>
  );
}
