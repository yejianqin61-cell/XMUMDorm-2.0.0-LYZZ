import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CONTENT = {
  zh: {
    back: '返回首页',
    title: '隐私政策',
    updated: '最后更新：2026-08-02',
    sections: [
      { title: '引言', paragraphs: ['厦马小筑（XMUMDorm）重视你的隐私。本政策说明我们如何收集、使用和保护你的个人信息。', '使用厦马小筑即表示你同意本隐私政策。'] },
      { title: '我们收集的信息', bullets: ['账号信息：学号、邮箱地址和用户名，用于登录及身份验证。', '个人资料：昵称、头像，以及你主动填写的学院、年级、专业和公开设置。', '用户内容：帖子、评论、食堂点评、图片、待办和其他由你在平台创建的内容。', '站内通知数据：与你的互动和平台服务相关的通知记录。厦马小筑不申请或使用系统通知权限。', '日志数据：服务器访问日志，如 IP 地址和请求时间，用于故障排查与安全防护。'] },
      { title: '我们如何使用信息', bullets: ['提供校园社区、食堂、课程表等服务。', '在站内信箱中展示与你相关的通知。', '改进服务并维护平台安全，防止滥用和垃圾信息。'] },
      { title: '信息共享', paragraphs: ['我们不会出售、出租或交易你的个人信息。'], bullets: ['在法律法规、司法或行政要求的必要范围内提供信息。', '向为本服务提供基础设施的服务商提供必要数据，包括 Railway 的应用托管与 Cloudflare R2 的图片对象存储。服务商仅按提供服务所需处理数据。'] },
      { title: '数据安全', bullets: ['密码以 bcrypt 哈希形式存储，不保存明文密码。', '网络通信使用 HTTPS 加密。', '你删除的内容不会再公开展示；数据处理仍可能受安全、审计或法律义务约束。'] },
      { title: '你的权利', bullets: ['你可在“我的”中查看和修改个人资料。', '你可删除自己发布的内容。', '你可在“我的”中选择“注销账号”自助停用账号。注销会立即结束登录且该账号无法再次登录；为维护平台安全、处理争议或履行法定义务，必要记录及已公开内容可能继续按本政策处理。'] },
      { title: '联系我们', paragraphs: ['如对本隐私政策或个人信息处理有疑问，请通过以下邮箱联系：'] },
    ],
  },
  en: {
    back: 'Back Home',
    title: 'Privacy Policy',
    updated: 'Last updated: August 2, 2026',
    sections: [
      { title: 'Introduction', paragraphs: ['厦马小筑 (XMUMDorm) values your privacy. This policy explains how we collect, use, and protect personal information.', 'By using 厦马小筑, you agree to this privacy policy.'] },
      { title: 'Information We Collect', bullets: ['Account information: student ID, email address, and username for sign-in and identity verification.', 'Profile information: nickname, avatar, campus information, and the visibility settings you choose.', 'User content: posts, comments, canteen reviews, images, todos, and other content you create.', 'In-app notification data related to your interactions and platform services. 厦马小筑 does not request or use system notification permission.', 'Log data such as IP address and request time for troubleshooting and security.'] },
      { title: 'How We Use Information', bullets: ['To provide campus community, canteen, and schedule features.', 'To show relevant notifications in the in-app mailbox.', 'To improve the service and keep the platform secure against abuse and spam.'] },
      { title: 'Information Sharing', paragraphs: ['We do not sell, rent, or trade personal information.'], bullets: ['When required by applicable law, judicial, or administrative requests.', 'With essential service providers, including Railway for application hosting and Cloudflare R2 for uploaded image storage. They process data only as needed to provide these services.'] },
      { title: 'Data Security', bullets: ['Passwords are stored using bcrypt hashing and never in plain text.', 'Network communications use HTTPS encryption.', 'Deleted content is no longer publicly shown, although necessary records may remain for security, audit, or legal obligations.'] },
      { title: 'Your Rights', bullets: ['You can review and edit your profile in My Zone.', 'You can delete content that you publish.', 'You can deactivate your account through “Deactivate account” in My Zone. This signs you out immediately and the account cannot sign in again. Necessary records and public content may still be handled under this policy for security, dispute handling, or legal obligations.'] },
      { title: 'Contact Us', paragraphs: ['For questions about this policy or personal information, contact:'] },
    ],
  },
};

export default function PrivacyPolicy() {
  const { lang } = useLanguage();
  const content = lang === 'en' ? CONTENT.en : CONTENT.zh;

  return (
    <div style={{ fontFamily: 'var(--post-ios-font)', background: 'var(--post-ios-bg-grouped, #f2f2f7)', minHeight: '100dvh', padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 40px)', color: 'var(--post-ios-label, rgba(0,0,0,0.88))', lineHeight: 1.8, maxWidth: 720, margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 24, color: 'var(--accent)', textDecoration: 'none', fontSize: 15 }}>{content.back}</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{content.title}</h1>
      <p style={{ color: 'var(--post-ios-secondary-label)', fontSize: 14, marginBottom: 32 }}>{content.updated}</p>
      {content.sections.map((section) => (
        <section key={section.title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph} style={{ marginBottom: 8 }}>{paragraph}</p>)}
          {section.bullets?.length ? <ul style={{ paddingLeft: 20 }}>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
        </section>
      ))}
      <p style={{ marginTop: 8 }}>Email: <a href="mailto:yejianqin61@gmail.com" style={{ color: 'var(--accent)' }}>yejianqin61@gmail.com</a></p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--post-ios-separator)', margin: '32px 0' }} />
      <Link to="/" style={{ display: 'inline-block', color: 'var(--accent)', textDecoration: 'none', fontSize: 15, marginBottom: 40 }}>{content.back}</Link>
    </div>
  );
}
