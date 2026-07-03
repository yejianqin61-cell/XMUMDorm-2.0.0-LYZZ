import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CONTENT = {
  zh: {
    back: '← 返回首页',
    title: '隐私政策',
    updated: '最后更新：2026-06-08',
    sections: [
      {
        title: '引言',
        paragraphs: [
          'XMUMDorm（厦马小筑 / Jack Dorm）重视你的隐私。本隐私政策说明我们如何收集、使用和保护你的个人信息。',
          '使用 XMUMDorm 即表示你同意本隐私政策的条款。',
        ],
      },
      {
        title: '我们收集的信息',
        bullets: [
          '账号信息：学号、邮箱地址、用户名，用于登录和身份验证。',
          '个人资料：昵称、头像（你主动上传时）。',
          '发布内容：帖子、评论、菜品点评、图片等你在平台创建的内容。',
          '设备信息：推送通知令牌（如你启用了通知），用于发送你关注内容的更新。',
          '日志数据：服务器自动记录的访问日志（IP 地址、请求时间），用于故障排查和安全防护。',
        ],
      },
      {
        title: '我们如何使用信息',
        bullets: [
          '提供校园社交服务（展示帖子、评论、食堂信息等）。',
          '向你发送通知（你关注的帖子有新评论、社团有更新等）。',
          '改进和优化我们的服务。',
          '维护平台安全（检测和防止滥用、垃圾信息）。',
        ],
      },
      {
        title: '信息共享',
        paragraphs: [
          '我们不会出售、出租或交易你的个人信息给第三方。',
          '我们可能在以下情况下共享信息：',
        ],
        bullets: [
          '依据法律要求：如法院命令或政府请求。',
          '服务提供商：如云存储服务（用于你上传的图片），这些提供商仅处理数据不拥有数据。',
        ],
      },
      {
        title: '数据安全',
        bullets: [
          '密码使用 bcrypt 加密存储，明文密码从不保存。',
          '所有网络通信使用 HTTPS 加密传输。',
          '你发布的内容可以随时自行删除（逻辑删除，已删除的内容不会被公开展示）。',
        ],
      },
      {
        title: '你的权利',
        bullets: [
          '访问和修改：你可以随时在“我的空间”中查看和编辑你的个人资料。',
          '删除内容：你可以删除自己发布的帖子、评论和图片。',
          '账号注销：如需注销账号，请联系我们。',
        ],
      },
      {
        title: '联系我们',
        paragraphs: ['如果你对隐私政策有任何疑问，请通过以下方式联系我们：'],
      },
    ],
  },
  en: {
    back: '← Back Home',
    title: 'Privacy Policy',
    updated: 'Last updated: June 8, 2026',
    sections: [
      {
        title: 'Introduction',
        paragraphs: [
          'XMUMDorm (Jack Dorm) values your privacy. This policy explains how we collect, use, and protect your personal information.',
          'By using XMUMDorm, you agree to the terms of this privacy policy.',
        ],
      },
      {
        title: 'Information We Collect',
        bullets: [
          'Account information: student ID, email address, and username for login and identity verification.',
          'Profile information: nickname and avatar when you choose to upload one.',
          'User content: posts, comments, food reviews, images, and other content you create on the platform.',
          'Device information: push notification tokens if you enable notifications, so we can send relevant updates.',
          'Log data: server access logs such as IP address and request time for troubleshooting and security protection.',
        ],
      },
      {
        title: 'How We Use Information',
        bullets: [
          'To provide campus social features such as posts, comments, and canteen information.',
          'To send notifications about things you follow, such as new comments or club updates.',
          'To improve and optimize our services.',
          'To keep the platform safe by detecting abuse and spam.',
        ],
      },
      {
        title: 'Information Sharing',
        paragraphs: [
          'We do not sell, rent, or trade your personal information to third parties.',
          'We may share information only in the following cases:',
        ],
        bullets: [
          'When required by law, such as a court order or government request.',
          'With service providers such as cloud storage used for uploaded images. These providers process data on our behalf and do not own it.',
        ],
      },
      {
        title: 'Data Security',
        bullets: [
          'Passwords are stored with bcrypt hashing and never kept in plain text.',
          'All network communication is encrypted with HTTPS.',
          'You may delete your own content at any time. Deleted content is no longer publicly displayed.',
        ],
      },
      {
        title: 'Your Rights',
        bullets: [
          'Access and edit: you can review and update your profile at any time in My Zone.',
          'Delete content: you can remove your own posts, comments, and images.',
          'Account deletion: contact us if you want to close your account.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions about this privacy policy, please contact us at:'],
      },
    ],
  },
};

export default function PrivacyPolicy() {
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
            <ul style={{ paddingLeft: 20 }}>
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
