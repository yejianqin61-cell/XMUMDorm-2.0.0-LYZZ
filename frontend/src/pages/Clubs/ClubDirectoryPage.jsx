import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Search, TriangleAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Toast } from '../../context/ToastContext';
import NeoCard from '../../components/retroui/Card';
import NeoBadge from '../../components/retroui/Badge';
import NeoInput from '../../components/retroui/Input';
import { NeoToggle } from '../../components/retroui/Toggle';
import {
  CLUB_DIRECTORY,
  CLUB_DIRECTORY_CATEGORIES,
  clubCategoryCounts,
  clubSearchText,
  findClubCategory,
  instagramLink,
  whatsappLink,
} from '@shared/config/clubDirectory';
import './ClubDirectory.css';

/**
 * 社团信息页 —— 全校社团联系方式总表。
 *
 * 数据是静态的（shared/config/clubDirectory.js），不入库，理由见那个文件头部。
 * 这一页没有后端请求，所以没有 loading / error 态，只有「搜不到」的空态。
 */
function ClubDirectoryPage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  // 记住「刚复制的是哪一个」，只让那一个按钮变成对勾
  const [copied, setCopied] = useState(null);

  const counts = useMemo(() => clubCategoryCounts(), []);
  const total = CLUB_DIRECTORY.length;

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return CLUB_DIRECTORY
      .filter((c) => cat === 'all' || c.category === cat)
      .filter((c) => !kw || clubSearchText(c).includes(kw))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }, [q, cat]);

  const isFiltered = Boolean(q.trim()) || cat !== 'all';

  const handleCopy = async (key, value) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(value);
      setCopied(key);
      Toast.success(isZh ? '已复制' : 'Copied');
      setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      // 非 HTTPS 或浏览器不给剪贴板权限时，引导用户手动选中
      Toast.error(isZh ? '复制失败，请手动选中' : 'Copy failed — select it manually');
    }
  };

  const copyIcon = (key) =>
    copied === key ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />;

  const chips = [
    { key: 'all', label: isZh ? '全部' : 'All', n: total },
    ...CLUB_DIRECTORY_CATEGORIES.map((c) => ({
      key: c.key,
      label: isZh ? c.labelZh : c.labelEn,
      n: counts[c.key] || 0,
    })).filter((c) => c.n > 0),
  ];

  return (
    <div className="club-page neo-club-page cd-page">
      <h1 className="neo-club-title">{isZh ? '社团信息页' : 'Club Directory'}</h1>
      <p className="cd-sub">
        {isZh
          ? `全校 ${total} 个社团的联系方式 · 点一下直接联系，不用再到处问人`
          : `How to reach all ${total} clubs on campus — tap to chat, no more asking around`}
      </p>

      <div className="cd-toolbar">
        <div className="cd-search">
          <Search size={16} aria-hidden />
          <NeoInput
            className="cd-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isZh ? '搜社团名 / 联系人 / IG 账号…' : 'Search club, person or IG…'}
            aria-label={isZh ? '搜索社团' : 'Search clubs'}
          />
        </div>

        <div className="cd-chips" role="group" aria-label={isZh ? '社团分类' : 'Club categories'}>
          {chips.map((c) => (
            <NeoToggle
              key={c.key}
              size="sm"
              variant="solid"
              pressed={cat === c.key}
              onPressedChange={() => setCat(c.key)}
            >
              {`${c.label} ${c.n}`}
            </NeoToggle>
          ))}
        </div>
      </div>

      <div className="cd-countline">
        <span>{isFiltered ? (isZh ? `找到 ${list.length} 个社团` : `${list.length} found`) : (isZh ? `共 ${list.length} 个社团` : `${list.length} clubs`)}</span>
        <span>{isZh ? '按名称 A→Z' : 'A→Z'}</span>
      </div>

      {list.length === 0 ? (
        <NeoCard className="cd-empty w-full">
          <div className="cd-empty-title">{isZh ? '没找到这个社团' : 'No club found'}</div>
          <div className="cd-empty-sub">
            {isZh ? '换个关键词，或者看看底部的补充入口' : 'Try another keyword, or use the link below'}
          </div>
        </NeoCard>
      ) : null}

      <div className="cd-list">
        {list.map((club) => {
          const category = findClubCategory(club.category);
          return (
            <NeoCard as="article" key={club.id} className="cd-row grid w-full">
              <div className="cd-mono" aria-hidden>{club.mono}</div>

              <div className="cd-body">
                <div className="cd-row-top">
                  <div className="cd-name-wrap">
                    <div className="cd-name">{club.name}</div>
                    {club.nameZh ? <div className="cd-name-zh">{club.nameZh}</div> : null}
                  </div>
                  {category ? (
                    <NeoBadge variant="default">{isZh ? category.labelZh : category.labelEn}</NeoBadge>
                  ) : null}
                  {club.review ? (
                    <NeoBadge variant="default" className="cd-review" title={club.review}>
                      <TriangleAlert size={11} aria-hidden />
                      <span>{isZh ? '待核实' : 'Unverified'}</span>
                    </NeoBadge>
                  ) : null}
                </div>

                <div className="cd-chans">
                  {club.whatsapp.map((w, i) => {
                    // 有联系人姓名就显示姓名；没有就显示号码本身。
                    // 只写「WhatsApp」的话，那些没给姓名的社团会长得一模一样、也没法核对号码。
                    const key = `${club.id}-wa-${i}`;
                    const label = w.name || w.display;
                    return (
                      <span className="cd-chan cd-chan--wa" key={key}>
                        <a
                          className="cd-chan-main"
                          href={whatsappLink(w.number)}
                          target="_blank"
                          rel="noreferrer noopener"
                          title={`WhatsApp ${w.display}${w.review ? ` · ${w.review}` : ''}`}
                        >
                          <i className="cd-dot" aria-hidden />
                          <span>{label}</span>
                          {w.role ? <span className="cd-role">{w.role}</span> : null}
                          {w.review ? <TriangleAlert size={11} aria-hidden /> : null}
                        </a>
                        <button
                          type="button"
                          className="cd-copy"
                          onClick={() => handleCopy(key, w.number)}
                          aria-label={isZh ? `复制 ${label} 的号码` : `Copy ${label}'s number`}
                        >
                          {copyIcon(key)}
                        </button>
                      </span>
                    );
                  })}

                  {club.instagram ? (
                    <span className="cd-chan cd-chan--ig">
                      <a
                        className="cd-chan-main"
                        href={instagramLink(club.instagram)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <i className="cd-dot" aria-hidden />
                        <span>{`@${club.instagram}`}</span>
                      </a>
                      <button
                        type="button"
                        className="cd-copy"
                        onClick={() => handleCopy(`${club.id}-ig`, club.instagram)}
                        aria-label={isZh ? `复制 ${club.instagram}` : `Copy ${club.instagram}`}
                      >
                        {copyIcon(`${club.id}-ig`)}
                      </button>
                    </span>
                  ) : club.instagramPending ? (
                    // 原文只给了 IG 显示名，不是 handle。拼 instagram.com/xxx 会 404，所以不给链接。
                    <span
                      className="cd-chan cd-chan--todo"
                      title={
                        isZh
                          ? `原文只给了显示名「${club.instagramPending}」，不是账号`
                          : `Only a display name was given: "${club.instagramPending}" — not a handle`
                      }
                    >
                      <span className="cd-chan-main">
                        <i className="cd-dot" aria-hidden />
                        <span>{isZh ? 'IG 待确认' : 'IG pending'}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="cd-chan cd-chan--todo">
                      <span className="cd-chan-main">
                        <i className="cd-dot" aria-hidden />
                        <span>{isZh ? '暂无 Instagram' : 'No Instagram'}</span>
                      </span>
                    </span>
                  )}

                  {club.xiaohongshu ? (
                    <span className="cd-chan cd-chan--xhs">
                      <a
                        className="cd-chan-main"
                        href={club.xiaohongshu}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <i className="cd-dot" aria-hidden />
                        <span>{isZh ? '小红书' : 'RED'}</span>
                      </a>
                    </span>
                  ) : null}
                </div>
              </div>
            </NeoCard>
          );
        })}
      </div>

      <div className="cd-footnote">
        {isZh
          ? '社团换届后联系方式经常变。发现信息过期或缺失，欢迎'
          : 'Club contacts change after each handover. Something out of date or missing? '}
        <Link className="cd-footnote-link" to="/about/join-us">
          {isZh ? '告诉我们' : 'Tell us'}
        </Link>
        {isZh ? '。' : '.'}
      </div>
    </div>
  );
}

export default ClubDirectoryPage;
