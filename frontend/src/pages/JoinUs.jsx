import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import './JoinUs.css';

/** 招募联系方式（文案由产品给定，中文为原文） */
const WECHAT_ID = 'xmumdorm666';

function JoinUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopied(true);
      Toast.success(isZh ? '微信号已复制' : 'WeChat ID copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 非 HTTPS 或浏览器不给剪贴板权限时，引导用户手动选中
      Toast.error(isZh ? '复制失败，请手动选中微信号' : 'Copy failed — please select the ID manually');
    }
  };

  return (
    <div className="join-us-page">
      <Card as="div" className="join-us-card">
        <h1 className="join-us-title">{isZh ? '加入我们' : 'Join Us'}</h1>

        <p className="join-us-lead">
          {isZh
            ? '如果你想学习怎么用AI开发出你自己的网站，如果你想共同成为Dorm的创造者。那就快快联系我们。'
            : 'If you want to learn how to build your own website with AI, and if you want to become a co-creator of Dorm — get in touch with us!'}
        </p>

        <div className="join-us-contact">
          <span className="join-us-contact-label">
            <MessageCircle size={16} aria-hidden="true" />
            {isZh ? '微信' : 'WeChat'}
          </span>
          <span className="join-us-contact-id">{WECHAT_ID}</span>
          <button
            type="button"
            className="join-us-copy"
            onClick={handleCopy}
            aria-label={isZh ? '复制微信号' : 'Copy WeChat ID'}
            title={isZh ? '复制微信号' : 'Copy WeChat ID'}
          >
            <Copy size={15} aria-hidden="true" />
            <span>{copied ? (isZh ? '已复制' : 'Copied') : (isZh ? '复制' : 'Copy')}</span>
          </button>
        </div>
      </Card>
    </div>
  );
}

export default JoinUs;
