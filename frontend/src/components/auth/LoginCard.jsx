/**
 * 登录/注册区极简卡片（白底 + 轻描边 + 轻阴影）
 */
export default function LoginCard({ children, className = '' }) {
  return (
    <div
      className={`relative w-full max-w-md rounded-3xl border border-slate-200/70 bg-white px-5 pb-6 pt-5 shadow-sm sm:px-6 sm:pb-7 sm:pt-6 ${className}`.trim()}
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
    >
      {children}
    </div>
  );
}
