import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div style={{
      fontFamily: 'var(--post-ios-font)',
      background: 'var(--post-ios-bg-grouped, #f2f2f7)',
      minHeight: '100dvh',
      padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 40px)',
      color: 'var(--post-ios-label, rgba(0,0,0,0.88))',
      lineHeight: 1.8,
      maxWidth: 720,
      margin: '0 auto',
    }}>
      <Link to="/" style={{
        display: 'inline-block',
        marginBottom: 24,
        color: 'var(--accent)',
        textDecoration: 'none',
        fontSize: 15,
      }}>
        ← 返回首页
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>隐私政策</h1>
      <p style={{ color: 'var(--post-ios-secondary-label)', fontSize: 14, marginBottom: 32 }}>
        最后更新：2026-06-08
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>引言</h2>
        <p style={{ marginBottom: 8 }}>
          XMUMDorm（厦马小筑 / Jack Dorm）重视你的隐私。本隐私政策说明我们如何收集、使用和保护你的个人信息。
        </p>
        <p>使用 XMUMDorm 即表示你同意本隐私政策的条款。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>我们收集的信息</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>账号信息</strong>：学号、邮箱地址、用户名，用于登录和身份验证。</li>
          <li><strong>个人资料</strong>：昵称、头像（你主动上传时）。</li>
          <li><strong>发布内容</strong>：帖子、评论、菜品点评、图片等你在平台创建的内容。</li>
          <li><strong>设备信息</strong>：推送通知令牌（如你启用了通知），用于发送你关注内容的更新。</li>
          <li><strong>日志数据</strong>：服务器自动记录的访问日志（IP 地址、请求时间），用于故障排查和安全防护。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>我们如何使用信息</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>提供校园社交服务（展示帖子、评论、食堂信息等）。</li>
          <li>向你发送通知（你关注的帖子有新评论、社团有更新等）。</li>
          <li>改进和优化我们的服务。</li>
          <li>维护平台安全（检测和防止滥用、垃圾信息）。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>信息共享</h2>
        <p>我们<strong>不会</strong>出售、出租或交易你的个人信息给第三方。</p>
        <p style={{ marginTop: 8 }}>我们可能在以下情况共享信息：</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>依据法律要求</strong>：如法院命令或政府请求。</li>
          <li><strong>服务提供商</strong>：如云存储服务（用于你上传的图片），这些提供商仅处理数据不拥有数据。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>数据安全</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>密码使用 bcrypt 加密存储，明文密码从不保存。</li>
          <li>所有网络通信使用 HTTPS 加密传输。</li>
          <li>你发布的内容可以随时自行删除（逻辑删除，已删除的内容不会被公开展示）。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>你的权利</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>访问和修改</strong>：你可以随时在"我的空间"中查看和编辑你的个人资料。</li>
          <li><strong>删除内容</strong>：你可以删除自己发布的帖子、评论和图片。</li>
          <li><strong>账号注销</strong>：如需注销账号，请联系我们。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>联系我们</h2>
        <p>如果你对隐私政策有任何疑问，请通过以下方式联系我们：</p>
        <p style={{ marginTop: 8 }}>
          邮箱：<a href="mailto:yejianqin61@gmail.com" style={{ color: 'var(--accent)' }}>yejianqin61@gmail.com</a>
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--post-ios-separator)', margin: '32px 0' }} />

      <Link to="/" style={{
        display: 'inline-block',
        color: 'var(--accent)',
        textDecoration: 'none',
        fontSize: 15,
        marginBottom: 40,
      }}>
        ← 返回首页
      </Link>
    </div>
  );
}
