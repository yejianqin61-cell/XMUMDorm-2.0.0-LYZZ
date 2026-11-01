import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContextState';
import { Toast } from '../../context/toast';
import { copyCampusNewsLink } from './campusNewsShare';

export default function CampusShareButton({ postId }) {
  const { isZh } = useLanguage();
  const [pending, setPending] = useState(false);
  return <button type="button" disabled={pending} aria-busy={pending}
    aria-label={isZh ? '分享校园快讯' : 'Share campus news'} title={isZh ? '复制快讯链接' : 'Copy news link'}
    onClick={async () => {
      setPending(true);
      try {
        await copyCampusNewsLink(postId, window.location.origin, navigator.clipboard);
        Toast.success(isZh ? '快讯链接已复制' : 'News link copied');
      } catch {
        Toast.error(isZh ? '复制失败，请重试或复制浏览器地址栏中的快讯链接。' : 'Copy failed. Please retry or copy the news URL from the address bar.');
      } finally { setPending(false); }
    }}><Share2 size={18} /></button>;
}
