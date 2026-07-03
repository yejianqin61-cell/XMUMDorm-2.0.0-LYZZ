import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CONTENT = {
  zh: {
    back: '← 返回首页',
    title: '用户服务协议',
    updated: '最后更新：2026-06-08',
    sections: [
      { title: '1. 服务说明', paragraphs: ['XMUMDorm（厦马小筑）是面向厦门大学马来西亚分校（XMUM）学生的校园社交与生活平台。我们提供帖子发布、食堂信息浏览、社团管理、二手交易、跑腿任务等功能。'] },
      { title: '2. 用户行为准则', paragraphs: ['在使用 XMUMDorm 时，你同意不发布以下内容：'], bullets: ['违法或违反校规的内容', '骚扰、威胁、欺凌或侵犯他人隐私的内容', '仇恨言论、歧视性言论', '色情或露骨内容', '垃圾信息、恶意广告或钓鱼链接', '侵犯他人知识产权的内容', '虚假信息或冒充他人身份'] },
      { title: '3. 内容管理', bullets: ['用户发布的内容不代表 XMUMDorm 的立场。', '我们有权删除违反用户行为准则的内容。', '用户可以通过举报功能报告违规内容，管理员会进行审核。', '被封禁或禁言的用户将无法发布新内容。'] },
      { title: '4. 知识产权', bullets: ['你保留对自己发布内容的所有权。', '发布到 XMUMDorm 的内容，你授予我们在平台上展示和分发该内容的许可。', 'XMUMDorm 的名称、Logo 和设计元素归平台所有。'] },
      { title: '5. 免责声明', bullets: ['XMUMDorm 按“现状”提供，不保证服务不中断或无错误。', '二手市场交易风险由买卖双方自行承担。', '跑腿任务的完成质量和时效由任务执行者负责。', '我们不承担因使用本服务而产生的任何间接损失。'] },
      { title: '6. 账号管理', bullets: ['每人限注册一个账号。', '不得将账号出借或转让给他人。', '违反规定的账号可能被暂停或永久封禁。'] },
      { title: '7. 协议修改', paragraphs: ['我们可能会不时更新本协议。重大变更会通过 App 内公告或邮件通知。继续使用服务即表示接受修改后的条款。'] },
      { title: '8. 联系我们', paragraphs: ['对本协议有任何疑问，请联系：'] },
    ],
  },
  en: {
    back: '← Back Home',
    title: 'Terms of Service',
    updated: 'Last updated: June 8, 2026',
    sections: [
      { title: '1. Service Overview', paragraphs: ['XMUMDorm is a campus social and lifestyle platform for students at Xiamen University Malaysia (XMUM). We provide features such as posting, canteen information, club management, second-hand trading, and errands.'] },
      { title: '2. User Conduct', paragraphs: ['When using XMUMDorm, you agree not to post the following:'], bullets: ['Illegal content or content that violates campus rules', 'Harassment, threats, bullying, or invasions of privacy', 'Hate speech or discriminatory language', 'Pornographic or explicit content', 'Spam, malicious ads, or phishing links', 'Content that infringes on intellectual property', 'False information or impersonation of others'] },
      { title: '3. Content Moderation', bullets: ['User-generated content does not represent the position of XMUMDorm.', 'We may remove content that violates these rules.', 'Users may report inappropriate content and administrators will review it.', 'Banned or muted users may lose the ability to post new content.'] },
      { title: '4. Intellectual Property', bullets: ['You retain ownership of the content you publish.', 'By posting on XMUMDorm, you grant us permission to display and distribute that content on the platform.', 'The XMUMDorm name, logo, and design assets belong to the platform.'] },
      { title: '5. Disclaimer', bullets: ['XMUMDorm is provided “as is” without a guarantee of uninterrupted or error-free service.', 'Risks in second-hand transactions are borne by buyers and sellers.', 'The quality and timeliness of errands are the responsibility of the task performer.', 'We are not liable for indirect losses arising from use of the service.'] },
      { title: '6. Account Management', bullets: ['Each person may register only one account.', 'Accounts may not be lent, shared, or transferred to others.', 'Accounts that violate the rules may be suspended or permanently banned.'] },
      { title: '7. Changes to These Terms', paragraphs: ['We may update these terms from time to time. Major changes will be announced in the app or by email. Continued use of the service means you accept the updated terms.'] },
      { title: '8. Contact Us', paragraphs: ['If you have any questions about these terms, please contact:'] },
    ],
  },
};

export default function TermsOfService() {
  const { lang } = useLanguage();
  const content = lang === 'en' ? CONTENT.en : CONTENT.zh;

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
      <Link to="/" style={{ display: 'inline-block', marginBottom: 24, color: 'var(--accent)', textDecoration: 'none', fontSize: 15 }}>
        {content.back}
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{content.title}</h1>
      <p style={{ color: 'var(--post-ios-secondary-label)', fontSize: 14, marginBottom: 32 }}>
        {content.updated}
      </p>

      {content.sections.map((section) => (
        <section key={section.title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} style={{ marginBottom: 8 }}>{paragraph}</p>
          ))}
          {section.bullets?.length ? (
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <p style={{ marginTop: 8 }}>
        Email: <a href="mailto:yejianqin61@gmail.com" style={{ color: 'var(--accent)' }}>yejianqin61@gmail.com</a>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--post-ios-separator)', margin: '32px 0' }} />

      <Link to="/" style={{ display: 'inline-block', color: 'var(--accent)', textDecoration: 'none', fontSize: 15, marginBottom: 40 }}>
        {content.back}
      </Link>
    </div>
  );
}
