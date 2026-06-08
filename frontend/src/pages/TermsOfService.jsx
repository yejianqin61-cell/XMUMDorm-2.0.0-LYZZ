import { Link } from 'react-router-dom';

export default function TermsOfService() {
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

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>用户服务协议</h1>
      <p style={{ color: 'var(--post-ios-secondary-label)', fontSize: 14, marginBottom: 32 }}>
        最后更新：2026-06-08
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. 服务说明</h2>
        <p>XMUMDorm（厦马小筑）是面向厦门大学马来西亚分校（XMUM）学生的校园社交与生活平台。我们提供帖子发布、食堂信息浏览、社团管理、二手交易、跑腿任务等功能。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. 用户行为准则</h2>
        <p>在使用 XMUMDorm 时，你同意不发布以下内容：</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>违法或违反校规的内容</li>
          <li>骚扰、威胁、欺凌或侵犯他人隐私的内容</li>
          <li>仇恨言论、歧视性言论</li>
          <li>色情或露骨内容</li>
          <li>垃圾信息、恶意广告或钓鱼链接</li>
          <li>侵犯他人知识产权的内容</li>
          <li>虚假信息或冒充他人身份</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. 内容管理</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>用户发布的内容不代表 XMUMDorm 的立场。</li>
          <li>我们有权删除违反用户行为准则的内容。</li>
          <li>用户可以通过举报功能报告违规内容，管理员会进行审核。</li>
          <li>被封禁或禁言的用户将无法发布新内容。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. 知识产权</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>你保留对自己发布内容的所有权。</li>
          <li>发布到 XMUMDorm 的内容，你授予我们在平台上展示和分发该内容的许可。</li>
          <li>XMUMDorm 的名称、Logo 和设计元素归平台所有。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. 免责声明</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>XMUMDorm 按"现状"提供，不保证服务不中断或无错误。</li>
          <li>二手市场交易风险由买卖双方自行承担。</li>
          <li>跑腿任务的完成质量和时效由任务执行者负责。</li>
          <li>我们不承担因使用本服务而产生的任何间接损失。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. 账号管理</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>每人限注册一个账号。</li>
          <li>不得将账号出借或转让给他人。</li>
          <li>违反规定的账号可能被暂停或永久封禁。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>7. 协议修改</h2>
        <p>我们可能会不时更新本协议。重大变更会通过 App 内公告或邮件通知。继续使用服务即表示接受修改后的条款。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>8. 联系我们</h2>
        <p>对本协议有任何疑问，请联系：</p>
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
