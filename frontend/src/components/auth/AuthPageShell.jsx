/**
 * 认证页外层：绿→蓝渐变 + 居中内容区（卡通在 LoginCard 外，由页面自行编排）
 */
export default function AuthPageShell({ children }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-emerald-400 via-teal-500 to-sky-600 [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 pb-10 pt-8 sm:px-5">
        {children}
      </div>
    </div>
  );
}
