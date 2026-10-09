import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import { useLanguage } from '../context/LanguageContextState';
import { Toast } from '../context/toast';
import './JoinUs.css';

/**
 * 招募联系方式（文案由产品给定，中文为原文）。
 * 2026-09-27 用户裁定：**全站唯一对外联系方式就是官方微信号**，邮箱与电话全部下线，
 * 所以这里的常量只剩微信号一个，不要再把邮箱加回来。
 */
const WECHAT_ID = 'xmumdorm666';

function JoinUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  // 记住「刚复制的是哪一个」，只让那一行的按钮变成「已复制」
  const [copiedValue, setCopiedValue] = useState(null);

  const handleCopy = async (value) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      Toast.success(isZh ? '已复制' : 'Copied');
      setTimeout(() => setCopiedValue((cur) => (cur === value ? null : cur)), 2000);
    } catch {
      // 非 HTTPS 或浏览器不给剪贴板权限时，引导用户手动选中
      Toast.error(isZh ? '复制失败，请手动选中' : 'Copy failed — please select it manually');
    }
  };

  const contacts = [
    {
      key: 'wechat',
      labelZh: '微信',
      labelEn: 'WeChat',
      value: WECHAT_ID,
      href: null,
      Icon: MessageCircle,
    },
  ];

  return (
    <div className="join-us-page">
      <Card as="div" className="join-us-card">
        <h1 className="join-us-title">{isZh ? '加入我们' : 'Join Us'}</h1>

        <p className="join-us-lead">
          {isZh
            ? '如果你想学习怎么用AI开发出你自己的网站，如果你想共同成为Dorm的创造者，如果你发现本站有任何使用问题，那就快快联系我们。'
            : 'If you want to learn how to build your own website with AI, if you want to become a co-creator of Dorm, or if you run into any problem while using this site — get in touch with us!'}
        </p>

        <ul className="join-us-contacts">
          {contacts.map(({ key, labelZh, labelEn, value, href, Icon }) => (
            <li key={key} className="join-us-contact">
              <span className="join-us-contact-label">
                <Icon size={16} aria-hidden="true" />
                {isZh ? labelZh : labelEn}
              </span>
              {href ? (
                <a className="join-us-contact-value" href={href}>{value}</a>
              ) : (
                <span className="join-us-contact-value">{value}</span>
              )}
              <button
                type="button"
                className="join-us-copy"
                onClick={() => handleCopy(value)}
                aria-label={isZh ? `复制${labelZh}` : `Copy ${labelEn}`}
                title={isZh ? `复制${labelZh}` : `Copy ${labelEn}`}
              >
                <Copy size={15} aria-hidden="true" />
                <span>
                  {copiedValue === value
                    ? (isZh ? '已复制' : 'Copied')
                    : (isZh ? '复制' : 'Copy')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default JoinUs;
