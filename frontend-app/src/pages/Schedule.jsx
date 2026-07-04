import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Coffee, MapPin, RefreshCw, Upload, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../context/ToastContext';
import { commitScheduleImport, getScheduleWeek, previewScheduleImport } from '@shared/api/schedule';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { QK } from '@shared/query/queryKeys';
import { readPersistedScheduleWeek, writePersistedScheduleWeek } from '../utils/schedulePersist';
import {
  getPushVapidPublicKey,
  subscribePush,
  unsubscribePushEndpoint,
  testPushNotification,
} from '@shared/api/push';
import './Schedule.css';

const DAY_LABEL_ZH = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
const DAY_LABEL_EN = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

/** 后端 day_of_week：1=周一 … 7=周日 */
function getTodayDayOfWeek() {
  const js = new Date().getDay(); // 0=周日 … 6=周六
  return js === 0 ? 7 : js;
}

/** VAPID 公钥（URL Safe Base64）→ Uint8Array */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function hmToMin(hm) {
  const s = String(hm || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return NaN;
  return h * 60 + mm;
}

function fmtHM(hm) {
  return String(hm || '').slice(0, 5);
}

function addFreeSlots(raw) {
  const list = Array.isArray(raw) ? [...raw] : [];
  list.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const cur = list[i];
    out.push({ kind: 'class', c: cur, key: `c-${cur.course_code}-${cur.start_time}-${i}` });
    const next = list[i + 1];
    if (!next) break;
    const endM = hmToMin(cur.end_time);
    const nextM = hmToMin(next.start_time);
    if (Number.isFinite(endM) && Number.isFinite(nextM) && nextM - endM >= 25) {
      // 交替用 coffee / book，让提示更轻盈
      out.push({
        kind: 'free',
        start: cur.end_time,
        end: next.start_time,
        icon: i % 2 === 0 ? 'coffee' : 'book',
        key: `free-${cur.end_time}-${next.start_time}-${i}`,
      });
    }
  }
  return out;
}

function Schedule() {
  const { lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const isZh = lang !== 'en';
  const [importOpen, setImportOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  const FIXED_WEEK = 1;
  const persistedWeek = useMemo(() => readPersistedScheduleWeek(FIXED_WEEK), []);
  const weekQuery = useQuery({
    queryKey: QK.scheduleWeek(FIXED_WEEK),
    queryFn: async () => {
      const data = await getScheduleWeek(FIXED_WEEK);
      writePersistedScheduleWeek(FIXED_WEEK, data);
      return data;
    },
    ...(persistedWeek !== undefined ? { initialData: persistedWeek } : {}),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const weekData = weekQuery.data ?? null;
  const loadingWeek = weekQuery.isFetching;

  const [text, setText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);

  const [pushBusy, setPushBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);

  const dayLabel = useMemo(() => (isZh ? DAY_LABEL_ZH : DAY_LABEL_EN), [isZh]);

  /** 非 HTTPS 且非 localhost 时，浏览器禁止使用 Web Push（手机用电脑 IP 的 http 会中招） */
  const pushSecureContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]');

  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    pushSecureContext;

  /** 按钮灰色时说明原因（微信内置页、iOS 非主屏幕 Web App 等常见） */
  const pushUnsupportedMessage = useMemo(() => {
    if (typeof window === 'undefined' || pushSupported) return null;
    const ua = navigator.userAgent || '';
    if (!pushSecureContext) {
      return isZh
        ? '当前连接不是「安全上下文」（需要 HTTPS）。请确认地址栏是 https:// 后再试。'
        : 'Not a secure context (HTTPS required). Check the URL uses https://.';
    }
    if (/MicroMessenger/i.test(ua)) {
      return isZh
        ? '微信内置浏览器不支持 Web 推送，所以「开启提醒」不可用。请点右上角 ··· →「在浏览器打开」/「用 Safari 打开」，用系统自带 Safari 或 Chrome 打开本站后再开启。'
        : 'WeChat’s in-app browser cannot use Web Push. Use ⋯ → Open in Safari/Chrome, then enable reminders.';
    }
    const looksVendorBrowser =
      /HuaweiBrowser|HBPC\/|HonorBrowser|OpenHarmony|ArkWeb|MiuiBrowser|XiaoMi\/MiuiBrowser|MZBrowser/i.test(ua);
    if (looksVendorBrowser) {
      return isZh
        ? '华为、小米、荣耀等手机自带浏览器对「网页推送」常见为不支持或支持不完整，所以按钮可能灰色（不是网站坏了）。请从应用市场安装 Chrome 或 微软 Edge，用它们打开本站的 https 链接并登录，再到课表页「开启提醒」。'
        : 'Some stock browsers (Huawei/Xiaomi/Honor, etc.) often lack full Web Push support. Install Chrome or Edge, open this site (HTTPS), log in, then enable reminders.';
    }
    if (!('serviceWorker' in navigator)) {
      return isZh
        ? '当前网页环境不提供 Service Worker（多见于应用内浏览器）。请复制链接，到手机上的 Safari、Chrome 或 Edge 中打开本站。'
        : 'No Service Worker (often in in-app browsers). Open this site in Safari, Chrome, or Edge.';
    }
    if (!('PushManager' in window)) {
      const isIOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        return isZh
          ? '在 iPhone / iPad 上，通常需要先把本站「添加到主屏幕」后，从桌面图标打开，才能使用推送（需 iOS 16.4+、Safari）。步骤：Safari 打开本站 → 分享 → 添加到主屏幕 → 点桌面图标进入 → 课表页再点开启提醒。'
          : 'On iOS, Web Push usually needs Add to Home Screen, then open from that icon (iOS 16.4+, Safari).';
      }
      return isZh
        ? '当前浏览器不支持推送接口。请尝试 Chrome / Edge，或升级系统与浏览器。'
        : 'This browser does not support Push. Try Chrome or Edge, or update your browser.';
    }
    return null;
  }, [pushSupported, pushSecureContext, isZh]);

  const refreshPushSubscription = useCallback(async () => {
    if (!pushSupported) {
      setPushOn(false);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushOn(!!sub);
    } catch (_) {
      setPushOn(false);
    }
  }, [pushSupported]);

  useEffect(() => {
    if (isLoggedIn) refreshPushSubscription();
  }, [isLoggedIn, refreshPushSubscription]);

  const handlePreview = async () => {
    if (!text || text.trim().length < 10) {
      Toast.error(isZh ? '请先粘贴课程表文本' : 'Paste timetable text first');
      return;
    }
    setPreviewing(true);
    try {
      const data = await previewScheduleImport(text);
      setPreview(data);
      Toast.success(isZh ? '解析完成' : 'Parsed');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '解析失败' : 'Parse failed'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!text || text.trim().length < 10) {
      Toast.error(isZh ? '请先粘贴课程表文本' : 'Paste timetable text first');
      return;
    }
    setPreviewing(true);
    try {
      await commitScheduleImport(text);
      Toast.success(isZh ? '导入成功' : 'Imported');
      setImportOpen(false);
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: QK.scheduleWeek(FIXED_WEEK) });
    } catch (e) {
      Toast.error(e?.message || (isZh ? '导入失败' : 'Import failed'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleEnableClassPush = async () => {
    if (!isLoggedIn) {
      Toast.error(isZh ? '请先登录' : 'Please log in');
      return;
    }
    // 开发环境禁用 SW：避免 Vite HMR/资源被 sw.js 缓存导致“前端不更新”
    if (import.meta.env.DEV) {
      Toast.error(isZh ? '开发环境已禁用推送（避免缓存导致前端不更新）' : 'Push is disabled in dev (avoid SW caching issues)');
      return;
    }
    if (!pushSupported) {
      Toast.error(isZh ? '当前浏览器不支持 Web 推送' : 'Web Push is not supported');
      return;
    }
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        Toast.error(isZh ? '未授予通知权限' : 'Notification permission denied');
        return;
      }
      let publicKey;
      try {
        publicKey = (await getPushVapidPublicKey())?.publicKey;
      } catch (e) {
        Toast.error(e?.message || (isZh ? '无法获取推送配置（检查后端 VAPID）' : 'Cannot load VAPID config'));
        return;
      }
      if (!publicKey) {
        Toast.error(isZh ? '后端未配置 VAPID' : 'VAPID not configured on server');
        return;
      }
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (regErr) {
        Toast.error(
          isZh
            ? `Service Worker 注册失败：${regErr?.message || regErr}（请确认能打开 /sw.js）`
            : `SW register failed: ${regErr?.message || regErr}`
        );
        return;
      }
      await navigator.serviceWorker.ready;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        Toast.error(isZh ? '未找到 Service Worker，请刷新页面重试' : 'No service worker; refresh and retry');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePush(sub.toJSON());
      setPushOn(true);
      Toast.success(isZh ? '已开启课前提醒（约课前 30 分钟）' : 'Class reminders on (~30 min before)');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '订阅失败' : 'Subscribe failed'));
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisableClassPush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        await sub.unsubscribe();
        try {
          await unsubscribePushEndpoint(ep);
        } catch (_) {
          /* 仍取消本地订阅 */
        }
      }
      setPushOn(false);
      Toast.success(isZh ? '已关闭课前提醒' : 'Reminders off');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '关闭失败' : 'Failed to disable'));
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    if (!isLoggedIn) return;
    setPushBusy(true);
    try {
      await testPushNotification();
      Toast.success(isZh ? '已发送测试推送，请留意系统通知' : 'Test sent; check system notifications');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '发送失败' : 'Send failed'));
    } finally {
      setPushBusy(false);
    }
  };

  const renderWeek = () => {
    const days = weekData?.days || {};
    const todayDow = getTodayDayOfWeek();
    const todayRaw = Array.isArray(days[todayDow]) ? days[todayDow] : [];
    const todayList = addFreeSlots(todayRaw);
    const todayDateStr = new Date().toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
    return (
      <div className="schedule-week">
        {weekQuery.isError && (
          <p className="state-error schedule-week-query-error" role="alert">
            {getApiErrorMessage(weekQuery.error) || (isZh ? '获取课表失败' : 'Failed to load schedule')}
          </p>
        )}
        <button
          type="button"
          className="schedule-smart-banner"
          onClick={() => setPushOpen(true)}
          aria-label={isZh ? '打开课前提醒设置' : 'Open reminders settings'}
        >
          <span className="schedule-smart-banner-track" aria-hidden>
            {pushOn
              ? (isZh ? '🔔 已开启课前提醒 · 点击管理 · ' : '🔔 Reminders ON · Tap to manage · ')
              : (isZh ? '🔔 不许翘课，点我打开提醒 · ' : "🔔 Don't let your tutor miss you. Tap to enable reminders. · ")}
          </span>
          <span className="schedule-smart-banner-track schedule-smart-banner-track--dup" aria-hidden>
            {pushOn
              ? (isZh ? '🔔 已开启课前提醒 · 点击管理 · ' : '🔔 Reminders ON · Tap to manage · ')
              : (isZh ? '🔔 不许翘课，点我打开提醒 · ' : "🔔 Don't let your tutor miss you. Tap to enable reminders. · ")}
          </span>
        </button>

        <div className="schedule-days">
          <section className="schedule-day schedule-today" aria-label={isZh ? '今日课程' : "Today's classes"}>
            <h2 className="schedule-day-title schedule-today-heading">
              <span>{isZh ? '今日课程' : "Today's classes"}</span>
              <span className="schedule-today-meta">
                {dayLabel[todayDow]}
                <span className="schedule-today-date">{todayDateStr}</span>
              </span>
            </h2>
            {todayList.filter((x) => x.kind === 'class').length === 0 ? (
              <div className="schedule-empty schedule-empty--gif">
                <img
                  src="/gif/vsgif_com_dogecoin-meme_.3422573.gif"
                  alt={isZh ? '今天无课' : 'No classes today'}
                  className="schedule-empty-gif"
                  loading="lazy"
                  decoding="async"
                />
                <div className="schedule-empty-text">
                  {isZh ? '今天没课，放心躺平' : 'No classes today. Enjoy your free time.'}
                </div>
              </div>
            ) : (
              <ul className="schedule-class-list">
                {todayList.map((it, idx) =>
                  it.kind === 'free' ? (
                    <li key={`today-${it.key}-${idx}`} className="schedule-free">
                      <div className="schedule-free-left">
                        {it.icon === 'coffee' ? <Coffee size={14} aria-hidden /> : <BookOpen size={14} aria-hidden />}
                        <span className="schedule-free-text">{isZh ? '空档 Free time' : 'Free time'}</span>
                      </div>
                      <span className="schedule-free-time">
                        {fmtHM(it.start)}-{fmtHM(it.end)}
                      </span>
                    </li>
                  ) : (
                    <li key={`today-${it.key}-${idx}`} className="schedule-class pressable">
                      <div className="schedule-class-accent" aria-hidden />
                      <div className="schedule-class-timecol">
                        <div className="schedule-class-time">{fmtHM(it.c.start_time)}</div>
                        <div className="schedule-class-time schedule-class-time--end">{fmtHM(it.c.end_time)}</div>
                      </div>
                      <div className="schedule-class-main">
                        <div className="schedule-class-name">{it.c.course_name}</div>
                        <div className="schedule-class-meta">
                          {it.c.venue ? (
                            <span className="schedule-class-venue">
                              <MapPin size={14} aria-hidden />
                              <span>{it.c.venue}</span>
                            </span>
                          ) : null}
                          <span className="schedule-class-code">{it.c.course_code}</span>
                        </div>
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>

          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const listRaw = Array.isArray(days[d]) ? days[d] : [];
            const list = addFreeSlots(listRaw);
            return (
              <section key={d} className="schedule-day">
                <h2 className="schedule-day-title">{dayLabel[d]}</h2>
                {list.filter((x) => x.kind === 'class').length === 0 ? (
                  <div className="schedule-empty schedule-empty--gif">
                    <img
                      src="/gif/vsgif_com_dogecoin-meme_.3422573.gif"
                      alt={isZh ? '无课程' : 'No classes'}
                      className="schedule-empty-gif"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="schedule-empty-text">
                      {isZh ? '无课程' : 'No classes'}
                    </div>
                  </div>
                ) : (
                  <ul className="schedule-class-list">
                    {list.map((it, idx) =>
                      it.kind === 'free' ? (
                        <li key={`${it.key}-${idx}`} className="schedule-free">
                          <div className="schedule-free-left">
                            {it.icon === 'coffee' ? <Coffee size={14} aria-hidden /> : <BookOpen size={14} aria-hidden />}
                            <span className="schedule-free-text">{isZh ? '空档 Free time' : 'Free time'}</span>
                          </div>
                          <span className="schedule-free-time">
                            {fmtHM(it.start)}-{fmtHM(it.end)}
                          </span>
                        </li>
                      ) : (
                        <li key={`${it.key}-${idx}`} className="schedule-class pressable">
                          <div className="schedule-class-accent" aria-hidden />
                          <div className="schedule-class-timecol">
                            <div className="schedule-class-time">{fmtHM(it.c.start_time)}</div>
                            <div className="schedule-class-time schedule-class-time--end">{fmtHM(it.c.end_time)}</div>
                          </div>
                          <div className="schedule-class-main">
                            <div className="schedule-class-name">{it.c.course_name}</div>
                            <div className="schedule-class-meta">
                              {it.c.venue ? (
                                <span className="schedule-class-venue">
                                  <MapPin size={14} aria-hidden />
                                  <span>{it.c.venue}</span>
                                </span>
                              ) : null}
                              <span className="schedule-class-code">{it.c.course_code}</span>
                            </div>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImport = () => {
    const stats = preview?.stats;
    const errors = Array.isArray(preview?.errors) ? preview.errors : [];
    return (
      <div className="schedule-import">
        <div className="schedule-import-card">
          <div className="schedule-import-title">{isZh ? '粘贴课程表文本' : 'Paste timetable text'}</div>
          <div className="schedule-import-guide">
            <div className="schedule-import-guide-title">{isZh ? '使用方法' : 'How to use'}</div>
            <ol className="schedule-import-guide-list">
              <li>{isZh ? '进入学校 AC 系统' : 'Open the university AC system'}</li>
              <li>{isZh ? '进入 Course List' : 'Go to Course List'}</li>
              <li>
                {isZh
                  ? '从表格左上角复制到右下角的所有文字'
                  : 'Select and copy all text from the top-left to the bottom-right of the table'}
              </li>
              <li>{isZh ? '粘贴至导入框' : 'Paste into the import box'}</li>
              <li>{isZh ? '点击导入' : 'Click Import'}</li>
            </ol>
          </div>
          <textarea
            className="schedule-import-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isZh ? '把选课系统复制出来的课程表整段粘贴到这里…' : 'Paste the copied timetable text here…'}
          />
          <div className="schedule-import-actions">
            <button
              type="button"
              className="schedule-btn schedule-btn-secondary"
              onClick={handlePreview}
              disabled={previewing}
            >
              {previewing ? (isZh ? '处理中…' : 'Working…') : (isZh ? '解析预览' : 'Preview')}
            </button>
            <button
              type="button"
              className="schedule-btn schedule-btn-primary"
              onClick={handleCommit}
              disabled={previewing}
            >
              {isZh ? '确认导入' : 'Import'}
            </button>
          </div>
        </div>

        {preview && (
          <div className="schedule-preview-card">
            <div className="schedule-preview-title">
              {isZh ? '解析结果' : 'Parsed result'}
              {stats ? (
                <span className="schedule-preview-stats">
                  {isZh ? `（${stats.courseCount} 门课 / ${stats.meetingCount} 条时间）` : ` (${stats.courseCount} courses / ${stats.meetingCount} meetings)`}
                </span>
              ) : null}
            </div>
            {errors.length > 0 && (
              <div className="schedule-preview-errors">
                <div className="schedule-preview-errors-title">{isZh ? '提示/错误' : 'Warnings/Errors'}</div>
                <ul className="schedule-preview-errors-list">
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {errors.length > 10 ? (
                  <div className="schedule-preview-more">{isZh ? `还有 ${errors.length - 10} 条…` : `${errors.length - 10} more…`}</div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schedule-page">
      <div className="schedule-topbar">
        <div className="schedule-title">Timetable</div>
        <button
          type="button"
          className="schedule-icon-btn"
          onClick={() => setImportOpen(true)}
          aria-label={isZh ? '导入课表' : 'Import timetable'}
          title={isZh ? '导入' : 'Import'}
        >
          <Upload size={18} aria-hidden />
        </button>
      </div>

      {renderWeek()}

      <button
        type="button"
        className="schedule-fab"
        onClick={() => weekQuery.refetch()}
        disabled={loadingWeek}
        aria-label={isZh ? '刷新课表' : 'Refresh schedule'}
        title={isZh ? '刷新' : 'Refresh'}
      >
        <RefreshCw size={20} aria-hidden className={loadingWeek ? 'is-spinning' : ''} />
      </button>

      {importOpen && (
        <div className="schedule-modal-overlay" role="dialog" aria-modal="true" aria-label={isZh ? '导入课表' : 'Import timetable'}>
          <div className="schedule-modal">
            <div className="schedule-modal-head">
              <div className="schedule-modal-title">{isZh ? '导入课表' : 'Import timetable'}</div>
              <button type="button" className="schedule-modal-close" onClick={() => setImportOpen(false)} aria-label="Close">
                <X size={18} aria-hidden />
              </button>
            </div>
            {renderImport()}
          </div>
        </div>
      )}

      {pushOpen && (
        <div className="schedule-modal-overlay" role="dialog" aria-modal="true" aria-label={isZh ? '课前提醒' : 'Reminders'}>
          <div className="schedule-modal">
            <div className="schedule-modal-head">
              <div className="schedule-modal-title">{isZh ? '课前提醒' : 'Class reminders'}</div>
              <button type="button" className="schedule-modal-close" onClick={() => setPushOpen(false)} aria-label="Close">
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="schedule-push-modal">
              <div className="schedule-push-desc">
                {isZh ? '吉隆坡时间，约每节课开始前 30 分钟推送' : 'KL time, push about 30 minutes before each class starts'}
              </div>
              {pushUnsupportedMessage ? (
                <p className="schedule-push-warn" role="status">
                  {pushUnsupportedMessage}
                </p>
              ) : null}
              <div className="schedule-push-actions">
                {!pushOn ? (
                  <button
                    type="button"
                    className="schedule-btn schedule-btn-primary"
                    disabled={pushBusy || !pushSupported}
                    onClick={handleEnableClassPush}
                  >
                    {pushBusy ? (isZh ? '处理中…' : 'Working…') : (isZh ? '开启提醒' : 'Enable')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="schedule-btn schedule-btn-secondary"
                    disabled={pushBusy}
                    onClick={handleDisableClassPush}
                  >
                    {isZh ? '关闭提醒' : 'Disable'}
                  </button>
                )}
                <button
                  type="button"
                  className="schedule-btn schedule-btn-secondary"
                  disabled={pushBusy || !pushOn}
                  onClick={handleTestPush}
                >
                  {isZh ? '测试推送' : 'Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;

