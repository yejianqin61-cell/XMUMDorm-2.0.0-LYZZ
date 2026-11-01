import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { SchoolSystemWebView, type SchoolSystemWebViewHandle } from '../SchoolSystemWebView';
import { SCHOOL_SYSTEMS } from '../schoolSystems';
import { MoodleWorkspaceScreen, type MoodleDeadlineView,
  type MoodleWorkspaceLabels } from './WorkspaceScreen';
import { MoodleDetailScreen, type MoodleDetailLabels } from './DetailScreen';
import { createMoodleSync } from './sync';
import { clearMoodleCache, confirmedMoodleSchoolIdentity, persistMoodleSnapshot,
  restoreMoodleSnapshot, subscribeMoodleInvalidation, moodleCacheGeneration } from './cache';
import type { MoodleIdentityResult } from './identity';
import type { MoodleBridgeResult, MoodleReadRequest } from './bridge';
import type { MoodleModule } from './contract';
import { safeMoodleReadUrl, type MoodleDetail, type MoodleDetailFailure, type MoodleDetailRequest,
  type MoodleDetailResult } from './detail';
import { isMoodleMaintenanceWindow } from './maintenance';
import { partitionMoodleDeadlines, planMoodleDeadlineReminders,
  type MoodleDeadlinePolicy, type MoodleReminderDelivery, type MoodleReminderPlan } from './deadlines';

export type MoodleReminderStatus = 'unavailable' | 'planned' | 'partial' | 'denied' | 'stale'
  | 'cleared' | 'failed';
export type MoodleWorkspaceHostLabels = MoodleWorkspaceLabels & MoodleDetailLabels & {
  clear: string; backToNative: string; deadlines: string; otherEvents: string; noDeadlines: string;
  eventType: (value: string | null) => string; actionableStatus: (value: boolean | null) => string;
  deadlineBucket: (value: 'valid' | 'past' | 'unset' | 'future-anomaly') => string;
  detailStatus: (value: 'loading' | MoodleDetailFailure) => string;
  reminderStatus: (value: MoodleReminderStatus) => string;
};
export type MoodleWorkspaceHostProps = {
  /** Role A supplies every app-authored label from the single application t function. */
  labels: MoodleWorkspaceHostLabels;
  onOpenOriginal: (url: string) => void;
  /** T-04 session probe forwarded from the embedded school page (password field present or not). */
  onSessionProbe?: (probe: { hasPasswordField: boolean }) => void;
  onReminderPlan?: (plan: MoodleReminderPlan) =>
    void | MoodleReminderDelivery | Promise<void | MoodleReminderDelivery>;
  onClearReminders?: () => void | Promise<void>;
  deadlinePolicy?: MoodleDeadlinePolicy;
  now?: () => number;
};
type DetailView = { module: MoodleModule; courseId: number; request: MoodleDetailRequest | null;
  status: 'loading' | 'success' | MoodleDetailFailure; data: MoodleDetail | null };

/** P7 workspace with P2 course lists and P3 detail. The route provides the only Screen. */
export function MoodleWorkspaceHost(props: MoodleWorkspaceHostProps): React.ReactElement {
  const { labels, deadlinePolicy } = props;
  const latest = React.useRef(props);
  React.useLayoutEffect(() => { latest.current = props; }, [props]);
  const bridge = React.useRef<SchoolSystemWebViewHandle>(null);
  const theme = useTheme();
  const { t } = useI18n();
  const read = React.useCallback((request: MoodleReadRequest) => bridge.current?.readMoodle(request) ?? null, []);
  const [controller] = React.useState(() => createMoodleSync({ read: () => null }));
  const [snapshot, setSnapshot] = React.useState(() => controller.snapshot());
  const [mode, setMode] = React.useState<'web' | 'native'>('web');
  const [entry, setEntry] = React.useState<'first-login' | 'current-native' | 'restored-native'>('first-login');
  const [trusted, setTrusted] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [sessionFailure, setSessionFailure] = React.useState<'expired' | 'wrong-origin' | null>(null);
  const [detail, setDetail] = React.useState<DetailView | null>(null);
  const [reminderStatus, setReminderStatus] = React.useState<MoodleReminderStatus>('unavailable');
  const pendingDetail = React.useRef<{ id: string; generation: number; view: DetailView } | null>(null);
  const schoolUser = React.useRef<number | null>(null);
  const proofSequence = React.useRef(0);
  const mounted = React.useRef(false);
  const reminderQueue = React.useRef(Promise.resolve());
  const reminderSequence = React.useRef(0);

  const deliverReminders = React.useCallback((plan: MoodleReminderPlan | null) => {
    const sequence = ++reminderSequence.current;
    const onPlan = latest.current.onReminderPlan;
    const action = plan === null ? latest.current.onClearReminders : onPlan && (() => onPlan(plan));
    if (!action) { setReminderStatus('unavailable'); return; }
    reminderQueue.current = reminderQueue.current.catch(() => undefined).then(async () => {
      try {
        const delivery = await action();
        if (mounted.current && sequence === reminderSequence.current) {
          const next: MoodleReminderStatus = plan === null ? 'cleared'
            : delivery === 'planned' || delivery === 'partial' || delivery === 'denied'
              || delivery === 'stale' ? delivery : 'planned';
          setReminderStatus(next);
        }
      } catch {
        if (mounted.current && sequence === reminderSequence.current) setReminderStatus('failed');
      }
    });
  }, []);

  React.useEffect(() => {
    mounted.current = true; controller.connectRead(read);
    const unsubscribeSync = controller.subscribe(() => setSnapshot(controller.snapshot()));
    const unsubscribeCache = subscribeMoodleInvalidation(() => {
      schoolUser.current = null; proofSequence.current += 1; pendingDetail.current = null;
      controller.cancel(false); setTrusted(false); setDetail(null); setEntry('first-login'); setMode('web');
      setSessionFailure(null);
      deliverReminders(null);
    });
    return () => {
      mounted.current = false; proofSequence.current += 1; pendingDetail.current = null;
      unsubscribeSync(); unsubscribeCache(); controller.cancel(false);
    };
  }, [controller, deliverReminders, read]);

  const onIdentity = React.useCallback(async (result: MoodleIdentityResult) => {
    if (result.status === 'expired' || result.status === 'wrong-origin') setSessionFailure(result.status);
    if (result.status !== 'confirmed' || schoolUser.current === result.userId) return;
    schoolUser.current = result.userId;
    const sequence = ++proofSequence.current;
    const restored = await restoreMoodleSnapshot();
    if (!mounted.current || sequence !== proofSequence.current || confirmedMoodleSchoolIdentity() !== result.userId) return;
    if (restored) controller.adoptCache(); else controller.cancel(false);
    setSessionFailure(null); setLoadFailed(false);
    setTrusted(true); setEntry(restored ? 'restored-native' : 'current-native'); setMode('native');
  }, [controller]);
  const onResponse = React.useCallback((result: MoodleBridgeResult, generation: number) => {
    if (result.status === 'expired' || result.status === 'wrong-origin') setSessionFailure(result.status);
    controller.receive(result, generation);
  }, [controller]);
  const onDetail = React.useCallback((result: MoodleDetailResult, generation: number) => {
    if (result.status === 'expired' || result.status === 'wrong-origin') setSessionFailure(result.status);
    const item = pendingDetail.current;
    if (!item || item.id !== result.requestId || item.generation !== generation || generation !== moodleCacheGeneration()) return;
    pendingDetail.current = null;
    setDetail({ ...item.view, status: result.status, data: result.status === 'success' ? result.data : null });
  }, []);
  const openOriginal = React.useCallback((url: string) => {
    if (schoolUser.current === null || schoolUser.current !== confirmedMoodleSchoolIdentity()) return;
    const safe = safeMoodleReadUrl(url) ?? safeMoodleReadUrl(url, true);
    if (safe) latest.current.onOpenOriginal(safe);
  }, []);
  const readDetail = React.useCallback((courseId: number, module: MoodleModule, discussionUrl?: string) => {
    const kind = discussionUrl ? 'discussion' : module.type;
    const url = discussionUrl ?? module.url;
    const request: MoodleDetailRequest | null = url && ['forum', 'discussion', 'assign', 'folder', 'resource'].includes(kind)
      ? { courseId, moduleId: module.id, kind: kind as MoodleDetailRequest['kind'], url } : null;
    const view: DetailView = { courseId, module, request, status: 'unavailable', data: null };
    if (!request) { pendingDetail.current = null; setDetail(view); return; }
    const id = bridge.current?.readMoodleDetail?.(request);
    if (!id) { pendingDetail.current = null; setDetail(view); return; }
    view.status = 'loading';
    pendingDetail.current = { id, generation: moodleCacheGeneration(), view };
    setDetail(view);
  }, []);

  const now = (props.now ?? Date.now)();
  const maintenance = isMoodleMaintenanceWindow(now);
  const buckets = partitionMoodleDeadlines(snapshot.data.states, snapshot.data.events, now, deadlinePolicy);
  const plan = planMoodleDeadlineReminders(buckets, now, deadlinePolicy);
  const planSignature = JSON.stringify(plan);
  React.useEffect(() => {
    if (!trusted || snapshot.phase !== 'ready') return;
    void persistMoodleSnapshot();
    deliverReminders(JSON.parse(planSignature) as MoodleReminderPlan);
  }, [trusted, snapshot.phase, snapshot.data.generation, planSignature, deliverReminders]);

  const deadlineIds = new Set([...buckets.valid, ...buckets.past, ...buckets.futureAnomalies].map((row) => row.event.id));
  const otherEvents = snapshot.data.events.filter((event) => !deadlineIds.has(event.id));
  const deadlineRows = [
    { key: 'valid' as const, rows: buckets.valid }, { key: 'past' as const, rows: buckets.past },
    { key: 'future-anomaly' as const, rows: buckets.futureAnomalies },
  ];
  /** 原生模式的这条动作不进宿主自己的行：它由工作台的工具行承载（一屏只一条工具行）。 */
  const clearButton = <Button testID="moodle-clear" label={labels.clear} variant="ghost"
    onPress={clearMoodleCache} />;
  /** 截止段的视图模型：分组与措辞归宿主，排版归屏幕（第四段只在一处定义顺序）。 */
  const deadlineView: MoodleDeadlineView = {
    title: labels.deadlines,
    groups: [
      ...deadlineRows.map(({ key, rows }) => ({ key, title: labels.deadlineBucket(key),
        items: rows.map((row) => ({ key: `deadline-${row.event.id}`, title: row.event.name,
          meta: labels.formatTime(row.dueAt) })) })),
      { key: 'unset', title: labels.deadlineBucket('unset'),
        items: buckets.unset.map((row) => ({ key: `unset-${row.courseId}:${row.module.id}`,
          title: row.module.name, meta: null })) },
    ].filter((group) => group.items.length > 0),
    otherTitle: labels.otherEvents,
    others: otherEvents.map((event) => ({ key: `event-${event.id}`, title: event.name,
      meta: [labels.eventType(event.eventType ?? null), labels.actionableStatus(event.action?.actionable ?? null),
        event.time > 0 && Number.isFinite(new Date(event.time * 1000).getTime())
          ? labels.formatTime(event.time * 1000) : null].filter(Boolean).join(' · ') })),
    reminder: labels.reminderStatus(reminderStatus),
    empty: labels.noDeadlines,
  };
  const detailOriginalUrl = detail?.request?.url ?? detail?.module.url;
  return <View testID="moodle-host" style={{ flex: 1 }}>
    {mode === 'web' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2'),
      padding: theme.space('space_3') }}>
      <Text>{labels.firstLogin}</Text>
      {sessionFailure ? <Text testID="moodle-session-failure" colorToken="text-danger">{labels.failure(sessionFailure)}</Text> : null}
      {loadFailed ? <><Text colorToken="text-danger">{labels.failure('unavailable')}</Text>
        <Button testID="moodle-login-retry" label={t('action.retry')} onPress={() => bridge.current?.reload?.()} /></> : null}
      <Button testID="moodle-native" label={labels.backToNative} disabled={!trusted} variant="secondary"
        onPress={() => { controller.adoptCache(); setMode('native'); }} />
      {clearButton}
    </View> : null}
    <View testID="moodle-webview-area" style={mode === 'web' ? { flex: 1 } : { height: 0, overflow: 'hidden' }}
      accessibilityElementsHidden={mode !== 'web'} importantForAccessibility={mode === 'web' ? 'auto' : 'no-hide-descendants'}>
      <SchoolSystemWebView ref={bridge} system={SCHOOL_SYSTEMS.find((system) => system.id === 'moodle')!} preserveSnapshotOnClose
        onMoodleIdentity={onIdentity} onMoodleResponse={onResponse} onMoodleDetail={onDetail}
        onMoodleLoadFailureChange={setLoadFailed}
        onSessionProbe={(probe) => latest.current.onSessionProbe?.(probe)} />
    </View>
    {mode === 'native' ? <View style={{ flex: 1 }}>
      {detail ? detail.status === 'success' && detail.data ? <MoodleDetailScreen detail={detail.data} labels={labels}
        title={detail.module.name}
        onBack={() => { pendingDetail.current = null; setDetail(null); }} onOriginal={openOriginal}
        onDiscussion={(url) => readDetail(detail.courseId, detail.module, url)} /> : <ScrollView>
          <Button label={labels.back} variant="ghost" onPress={() => { pendingDetail.current = null; setDetail(null); }} />
          <Text colorToken={detail.status === 'loading' ? 'text-secondary' : 'text-danger'}>
            {labels.detailStatus(detail.status === 'success' ? 'invalid-data' : detail.status)}</Text>
          {detail.request && detail.status !== 'loading' ? <Button testID="moodle-detail-retry"
            label={t('action.retry')} onPress={() => readDetail(detail.courseId, detail.module,
              detail.request?.kind === 'discussion' ? detail.request.url : undefined)} /> : null}
          {detailOriginalUrl ? <Button label={labels.original} variant="link" onPress={() => openOriginal(detailOriginalUrl)} /> : null}
        </ScrollView> : <>
        <MoodleWorkspaceScreen labels={labels} snapshot={snapshot} entry={entry} maintenance={maintenance}
          headerActions={clearButton}
          onLogin={() => { bridge.current?.cancelMoodleReads?.(); controller.cancel(false); setMode('web'); }}
          onSync={() => { pendingDetail.current = null; setDetail(null); controller.start(); }}
          onCancel={() => { bridge.current?.cancelMoodleReads?.(); controller.cancel(); }}
          onChoose={(ids) => controller.choose(ids)} onModule={readDetail} onOriginal={openOriginal}
          deadlines={deadlineView} />
      </>}
    </View> : null}
  </View>;
}
