/**
 * 登录/注册区玻璃拟态圆角卡片（渐变底 + 毛玻璃 + 描边）
 */
export default function LoginCard({ children, className = '' }) {
  return (
    <div
      className={`relative w-full max-w-md rounded-[1.85rem] border border-white/40 bg-gradient-to-b from-white/35 via-cyan-100/25 to-sky-200/20 px-5 pb-6 pt-5 shadow-2xl shadow-teal-950/20 backdrop-blur-xl sm:px-6 sm:pb-7 sm:pt-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
