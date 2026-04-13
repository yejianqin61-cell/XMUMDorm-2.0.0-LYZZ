/**
 * 认证页外层：绿→蓝渐变 + 居中内容区（卡通在 LoginCard 外，由页面自行编排）
 * @param {boolean} [dense] 为 true 时一屏紧凑布局（用于注册页等）
 */
export default function AuthPageShell({ children, dense = false }) {
  const outer = dense
    ? 'h-[100dvh] max-h-[100dvh] overflow-x-hidden [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]'
    : 'min-h-screen [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]';

  const inner = dense
    ? 'min-h-0 flex-1 justify-start gap-1.5 overflow-y-auto px-3 pb-2 pt-[max(0.25rem,env(safe-area-inset-top,0px))] sm:gap-2 sm:px-4 sm:pb-3'
    : 'flex-1 justify-center gap-7 px-4 pb-10 pt-8 sm:px-5';

  return (
    <div
      className={`flex w-full flex-col bg-gradient-to-b from-emerald-400 via-teal-500 to-sky-600 ${outer}`.trim()}
    >
      <div className={`flex flex-col items-center ${inner}`.trim()}>{children}</div>
    </div>
  );
}
