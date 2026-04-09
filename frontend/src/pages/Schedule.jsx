import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../context/ToastContext';
import { commitScheduleImport, getScheduleWeek, previewScheduleImport } from '../api/schedule';
import { getApiErrorMessage } from '../utils/apiError';
import { QK } from '../query/queryKeys';
import {
  getPushVapidPublicKey,
  subscribePush,
  unsubscribePushEndpoint,
  testPushNotification,
} from '../api/push';
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

function Schedule() {
  const { lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('view'); // 'view' | 'import'

  const FIXED_WEEK = 1;
  const weekQuery = useQuery({
    queryKey: QK.scheduleWeek(FIXED_WEEK),
    queryFn: () => getScheduleWeek(FIXED_WEEK),
    staleTime: 5 * 60 * 1000,
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
    if (isLoggedIn && tab === 'view') refreshPushSubscription();
  }, [isLoggedIn, tab, refreshPushSubscription]);

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
      setTab('view');
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
    const todayList = [...todayRaw].sort((a, b) =>
      String(a.start_time || '').localeCompare(String(b.start_time || ''))
    );
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
        {isLoggedIn && (
          <div className="schedule-push-card">
            <div className="schedule-push-title">
              {isZh ? '课前提醒 Web Push' : 'Class reminders (Web Push)'}
            </div>
            <p className="schedule-push-desc">
              {isZh
                ? '吉隆坡时间, 约每节课开始前30分钟推送'
                : 'KL time, push about 30 minutes before each class starts'}
            </p>
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
                  {pushBusy
                    ? (isZh ? '处理中…' : 'Working…')
                    : (isZh ? '开启提醒 Enable' : 'Enable reminders')}
                </button>
              ) : (
                <button
                  type="button"
                  className="schedule-btn schedule-btn-secondary"
                  disabled={pushBusy}
                  onClick={handleDisableClassPush}
                >
                  {isZh ? '关闭提醒 Disable' : 'Disable reminders'}
                </button>
              )}
              <button
                type="button"
                className="schedule-btn schedule-btn-secondary"
                disabled={pushBusy || !pushOn}
                onClick={handleTestPush}
              >
                {isZh ? '测试推送 Test' : 'Test push'}
              </button>
            </div>
          </div>
        )}

        <div className="schedule-week-toolbar">
          <div className="schedule-week-fixed">
            {isZh ? '固定课表（仅在重新导入后更新）' : 'Fixed schedule (updates only after re-import)'}
          </div>
          <button
            type="button"
            className="schedule-btn schedule-btn-primary"
            onClick={() => weekQuery.refetch()}
            disabled={loadingWeek}
          >
            {loadingWeek ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '刷新' : 'Refresh')}
          </button>
        </div>

        <div className="schedule-days">
          <section className="schedule-day schedule-today" aria-label={isZh ? '今日课程' : "Today's classes"}>
            <h2 className="schedule-day-title schedule-today-heading">
              <span>{isZh ? '今日课程' : "Today's classes"}</span>
              <span className="schedule-today-meta">
                {dayLabel[todayDow]}
                <span className="schedule-today-date">{todayDateStr}</span>
              </span>
            </h2>
            {todayList.length === 0 ? (
              <div className="schedule-empty">
                {isZh ? '今天无课或请先导入课表' : 'No classes today, or import your schedule first'}
              </div>
            ) : (
              <ul className="schedule-class-list">
                {todayList.map((c, idx) => (
                  <li key={`today-${c.course_code}-${c.start_time}-${idx}`} className="schedule-class">
                    <div className="schedule-class-main">
                      <div className="schedule-class-name">{c.course_name}</div>
                      <div className="schedule-class-meta">
                        <span className="schedule-class-time">
                          {String(c.start_time).slice(0, 5)}-{String(c.end_time).slice(0, 5)}
                        </span>
                        {c.venue ? <span className="schedule-class-venue">{c.venue}</span> : null}
                      </div>
                    </div>
                    <div className="schedule-class-code">{c.course_code}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const list = Array.isArray(days[d]) ? days[d] : [];
            return (
              <section key={d} className="schedule-day">
                <h2 className="schedule-day-title">{dayLabel[d]}</h2>
                {list.length === 0 ? (
                  <div className="schedule-empty">{isZh ? '无课程' : 'No classes'}</div>
                ) : (
                  <ul className="schedule-class-list">
                    {list.map((c, idx) => (
                      <li key={`${c.course_code}-${c.start_time}-${idx}`} className="schedule-class">
                        <div className="schedule-class-main">
                          <div className="schedule-class-name">{c.course_name}</div>
                          <div className="schedule-class-meta">
                            <span className="schedule-class-time">
                              {String(c.start_time).slice(0, 5)}-{String(c.end_time).slice(0, 5)}
                            </span>
                            {c.venue ? <span className="schedule-class-venue">{c.venue}</span> : null}
                          </div>
                        </div>
                        <div className="schedule-class-code">{c.course_code}</div>
                      </li>
                    ))}
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
      <div className="schedule-tabs" role="tablist" aria-label={isZh ? '课程表' : 'Schedule'}>
        <button
          type="button"
          className={`schedule-tab ${tab === 'view' ? 'active' : ''}`}
          onClick={() => setTab('view')}
        >
          {isZh ? '课表' : 'Schedule'}
        </button>
        <button
          type="button"
          className={`schedule-tab ${tab === 'import' ? 'active' : ''}`}
          onClick={() => setTab('import')}
        >
          {isZh ? '导入' : 'Import'}
        </button>
      </div>

      {tab === 'view' ? renderWeek() : renderImport()}
    </div>
  );
}

export default Schedule;

