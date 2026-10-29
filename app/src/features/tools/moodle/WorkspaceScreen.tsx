import * as React from 'react';
import { ScrollView, View } from 'react-native';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { onlineManager } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import type { MoodleFailure } from './bridge';
import type { MoodleModule } from './contract';
import type { MoodleSyncPhase, MoodleSyncSnapshot } from './sync';

/** The route owner fills these labels from the single application t function. */
export type MoodleWorkspaceLabels = {
  firstLogin: string; restoredNative: string; nativeWorkspace: string; login: string; sync: string; cancel: string;
  confirmSelection: string; chooseCourses: string; courses: string; allTypes: string; switchCourse: string;
  empty: string; original: string; details: string; unknownSection: string; maintenance: string; offline: string;
  phase: (value: MoodleSyncPhase) => string;
  failure: (value: MoodleFailure) => string;
  moduleType: (value: string) => string;
};
/** One deadline row: the event name plus its secondary line, already localised by the host. */
export type MoodleDeadlineItem = { key: string; title: string; meta: string | null };
/** One bucket or event group: a short group title and its rows. */
export type MoodleDeadlineGroup = { key: string; title: string; items: MoodleDeadlineItem[] };
/**
 * The deadline section's view model. The host owns the bucketing and the wording; the
 * screen only lays the section out, so the page keeps the section order in one place.
 */
export type MoodleDeadlineView = {
  title: string;
  groups: MoodleDeadlineGroup[];
  otherTitle: string;
  others: MoodleDeadlineItem[];
  reminder: string;
  /** Shown when every bucket and the other events are empty. */
  empty: string;
};

export type MoodleWorkspaceScreenProps = {  labels: MoodleWorkspaceLabels;
  snapshot: MoodleSyncSnapshot;
  entry: 'first-login' | 'current-native' | 'restored-native';
  onLogin: () => void; onSync: () => void; onCancel: () => void;
  onChoose: (ids: number[]) => void;
  onModule: (courseId: number, module: MoodleModule) => void;
  onOriginal: (url: string) => void;
  maintenance?: boolean;
  /** Host-owned actions that belong in the same tool row (clear cached data). */
  headerActions?: React.ReactNode;
  /** Deadline section, rendered as the fourth section after the content section. */
  deadlines?: MoodleDeadlineView;
  /** Content appended inside the single vertical scroller (deadlines, reminder status). */
  footer?: React.ReactNode;
};

/**
 * Native Moodle workspace as three stacked sections: status, courses, content.
 *
 * The section boundary is the hierarchy: the status row carries the actions, the course
 * section owns picking and filtering, and the content section owns chapters. Phase 3 adds
 * the deadline section behind `footer`.
 */
export function MoodleWorkspaceScreen({ labels, snapshot, entry, onLogin, onSync, onCancel,
  onChoose, onModule, onOriginal, maintenance, headerActions, deadlines, footer }: MoodleWorkspaceScreenProps): React.ReactElement {
  const theme = useTheme();
  const [choice, setChoice] = React.useState({ generation: snapshot.data.generation, ids: snapshot.selectedIds });
  const draft = choice.generation === snapshot.data.generation ? choice.ids : snapshot.selectedIds;
  const [courseId, setCourseId] = React.useState<number | null>(null);
  const [type, setType] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const scroller = React.useRef<ScrollView>(null);
  const contentTop = React.useRef(0);
  React.useEffect(() => {
    // 切课之后内容段整体换掉：把视口带到内容段开头，而不是停在课程段
    if (courseId === null) return;
    // 测试环境只有宿主桩，没有真实滚动；这里按存在性调用，不假设实现
    scroller.current?.scrollTo?.({ y: contentTop.current, animated: false });
  }, [courseId]);
  const currentCourse = snapshot.data.courses.find((course) => course.id === courseId)
    ?? snapshot.data.courses[0];
  const courseState = snapshot.data.states.find((state) => state.courseId === currentCourse?.id);
  const modules = (courseState?.modules ?? []).filter((module) => module.visible && module.userVisible);
  const types = [...new Set(modules.map((module) => module.type))];
  const visibleModules = modules.filter((module) => type === null || module.type === type);
  const sections = [...(courseState?.sections ?? [])];
  for (const module of visibleModules) {
    if (!sections.some((section) => section.id === module.sectionId)) {
      sections.push({ id: module.sectionId, number: 0, title: labels.unknownSection, moduleIds: [],
        url: null, visible: true, current: false });
    }
  }
  const busy = snapshot.phase === 'loading-courses' || snapshot.phase === 'loading-objects';
  const online = React.useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(() => onStoreChange()),
    () => onlineManager.isOnline(),
    () => true
  );
  const hasCourses = snapshot.data.courses.length > 0;
  return <ScrollView ref={scroller} testID="moodle-workspace" contentContainerStyle={{ padding: theme.space('space_4'),
    gap: theme.space('space_6') }}>
    <View testID="moodle-section-status" style={{ gap: theme.space('space_2') }}>
      <View testID="moodle-tool-row" style={{ flexDirection: 'row', flexWrap: 'wrap',
        alignItems: 'center', gap: theme.space('space_2') }}>
        <Button testID="moodle-sync" label={labels.sync} onPress={onSync} disabled={busy} />
        {busy ? <Button testID="moodle-cancel" label={labels.cancel} onPress={onCancel} variant="ghost" /> : null}
        <Button testID="moodle-login" label={labels.login} onPress={onLogin} variant="ghost" />
        {headerActions}
      </View>
      <Text testID="moodle-entry" role="caption" colorToken="text-secondary">{entry === 'first-login' ? labels.firstLogin
        : entry === 'restored-native' ? labels.restoredNative : labels.nativeWorkspace}</Text>
      <Text testID="moodle-phase" role="caption" colorToken="text-secondary">{labels.phase(snapshot.phase)}</Text>
      {!online ? <InlineNotice testID="moodle-offline" tone="warning" message={labels.offline} /> : null}
      {snapshot.failure ? <InlineNotice testID="moodle-failure" tone="danger"
        message={maintenance && snapshot.failure !== 'expired' && snapshot.failure !== 'wrong-origin'
          ? labels.maintenance : labels.failure(snapshot.failure)}
        actionLabel={snapshot.failure === 'expired' || snapshot.failure === 'wrong-origin' ? labels.login : labels.sync}
        onAction={snapshot.failure === 'expired' || snapshot.failure === 'wrong-origin' ? onLogin : onSync} /> : null}
    </View>
    <View testID="moodle-section-courses" style={{ gap: theme.space('space_3') }}>
      <SectionHeader title={snapshot.phase === 'choosing' ? labels.chooseCourses : labels.courses}
        style={{ paddingHorizontal: 0 }} />
      {snapshot.phase === 'choosing' ? <Card variant="plain" padding="space_3">
        {snapshot.candidates.map((course) => <Checkbox key={course.id} testID={`moodle-select-${course.id}`}
          label={course.name} state={draft.includes(course.id) ? 'checked' : 'unchecked'}
          onPress={() => setChoice({ generation: snapshot.data.generation, ids: draft.includes(course.id)
            ? draft.filter((id) => id !== course.id) : [...draft, course.id] })} />)}
        <Button testID="moodle-confirm-selection" label={labels.confirmSelection} onPress={() => onChoose(draft)} />
      </Card> : null}
      {busy && !hasCourses ? <LoadingState testID="moodle-courses-loading" /> : null}
      {!busy && snapshot.phase !== 'choosing' && !hasCourses ? <EmptyState kind="firstRun"
        testID="moodle-empty-courses" title={labels.empty} actionLabel={labels.sync} onAction={onSync} /> : null}
      {snapshot.phase !== 'choosing' && hasCourses ? <>
        <View style={{ gap: theme.space('space_1') }}>
          <Text testID="moodle-current-course" role="headline" emphasis="strong">
            {currentCourse?.name ?? ''}</Text>
          <Button testID="moodle-switch-course" label={labels.switchCourse} variant="link" size="small"
            style={{ alignSelf: 'flex-start' }}
            onPress={() => setPickerOpen((open) => !open)} />
        </View>
        {pickerOpen ? <Card variant="plain" padding="none">
          {snapshot.data.courses.map((course) => <ListItem key={course.id} testID={`moodle-course-${course.id}`}
            title={course.name}
            onPress={() => { setCourseId(course.id); setType(null); setPickerOpen(false); }} />)}
        </Card> : null}
        <ScrollView testID="moodle-chips" horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space('space_2') }}>
          <Chip testID="moodle-type-all" variant="selectable" selected={type === null} label={labels.allTypes}
            onPress={() => setType(null)} />
          {types.map((item) => <Chip key={item} testID={`moodle-type-${item}`} variant="selectable"
            selected={type === item} label={labels.moduleType(item)} onPress={() => setType(item)} />)}
        </ScrollView>
      </> : null}
    </View>
    {snapshot.phase === 'choosing' || !hasCourses ? null : <View testID="moodle-section-content"
      onLayout={(event) => { contentTop.current = event.nativeEvent.layout.y; }}
      style={{ gap: theme.space('space_3') }}>
      {busy ? <LoadingState testID="moodle-content-loading" /> : visibleModules.length === 0 ? <EmptyState
        testID={type !== null ? 'moodle-empty-all-types' : 'moodle-empty-modules'}
        kind={type !== null ? 'noResult' : 'firstRun'} title={labels.empty}
        actionLabel={type !== null ? labels.allTypes : labels.sync}
        onAction={type !== null ? () => setType(null) : onSync} /> : null}
      {sections.map((section) => {
        const rows = visibleModules.filter((module) => module.sectionId === section.id);
        if (rows.length === 0) return null;
        return <Card key={section.id} testID={`moodle-chapter-${section.id}`} variant="plain" padding="none">
          <SectionHeader title={section.title} numberOfLines={2}
            style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_3') }} />
          {rows.map((module) => <ListItem key={module.id} testID={`moodle-module-${module.id}`}
            title={module.name}
            trailing={<View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}>
              <Chip testID={`moodle-module-type-${module.id}`} variant="static"
                label={labels.moduleType(module.type)} />
              {module.url ? <IconButton testID={`moodle-original-${module.id}`} Icon={ExternalLink}
                accessibilityLabel={labels.original} onPress={() => onOriginal(module.url!)} /> : null}
            </View>}
            onPress={() => currentCourse && onModule(currentCourse.id, module)} />)}
        </Card>;
      })}
    </View>}
    {deadlines ? <View testID="moodle-section-deadlines" style={{ gap: theme.space('space_2') }}>
      <SectionHeader title={deadlines.title} style={{ paddingHorizontal: 0 }} />
      {deadlines.groups.length === 0 && deadlines.others.length === 0
        ? <Text role="caption" colorToken="text-secondary">{deadlines.empty}</Text>
        : <Card variant="plain" padding="none">
        {deadlines.groups.map((group) => <View key={group.key}>
          <Text role="label" colorToken="text-secondary"
            style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_2') }}>
            {group.title}</Text>
          {group.items.map((item) => <View key={item.key} style={{ paddingHorizontal: theme.space('space_4'),
            paddingVertical: theme.space('space_1'), gap: theme.space('space_1') }}>
            <Text role="body">{item.title}</Text>
            {item.meta ? <Text role="caption" colorToken="text-secondary">{item.meta}</Text> : null}
          </View>)}
        </View>)}
        {deadlines.others.length === 0 ? null : <View>
          <Text role="label" colorToken="text-secondary"
            style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_2') }}>
            {deadlines.otherTitle}</Text>
          {deadlines.others.map((item) => <View key={item.key} style={{ paddingHorizontal: theme.space('space_4'),
            paddingVertical: theme.space('space_1'), gap: theme.space('space_1') }}>
            <Text role="body">{item.title}</Text>
            {item.meta ? <Text role="caption" colorToken="text-secondary">{item.meta}</Text> : null}
          </View>)}
        </View>}
        </Card>}
      <Text testID="moodle-reminder-status" role="caption" colorToken="text-secondary">
        {deadlines.reminder}</Text>
    </View> : null}
    {footer}
  </ScrollView>;
}
