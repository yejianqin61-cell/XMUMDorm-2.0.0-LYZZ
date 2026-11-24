import { FeatureScreen } from '@/components/ui/FeatureScreen';
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { UnderlineFilter } from '@/components/ui/UnderlineFilter';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/Input';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { MediaGrid } from '@/components/ui/MediaGrid';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { DetailScreen } from '@/proto/P3';
import { addClubMember, deleteClubActivity, deleteClubPost, getActivityDetail, getClubPostDetail, getClubProfile, listClubs, listMyClubs, removeClubMember } from '../../../../shared/api/clubs';
import { readClubActivityDetail, readClubPage, readClubPostDetail, readClubProfile, CLUB_CATEGORIES, type ClubActivityDetail, type ClubCategory, type ClubPostDetail, type ClubProfile, type ClubSummary } from './model';
import { useClubActivityRegistration, type ClubActivityRegistrationState } from './useClubActivityRegistration';
import { useClubComments } from './useClubComments';
import { exportClubActivityRegistrationsToDevice } from './exportRegistrations';
import { useClubFollow, type ClubFollowState } from './useClubFollow';
import { useClubLike, type ClubLikeState } from './useClubLike';
import { useSession } from '@/features/auth/session';
import { classifyAuthFailure, isSessionInvalid } from '@/features/auth/authFailure';

function asPositiveId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

function appError(error: unknown): { kind: 'content' | 'permission' | 'signin' | 'unreachable' | 'unknown' } {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) return { kind: 'content' };
  if (status === 401) return { kind: 'signin' };
  if (status === 403) return { kind: 'permission' };
  return { kind: error instanceof TypeError ? 'unreachable' : 'unknown' };
}

type ClubActionNoticeState = ClubFollowState | ClubLikeState | ClubActivityRegistrationState;

/** Renders the shared failure feedback for club interactions (follow/like/registration). */
function ClubActionNotice({ state, testID, onLogin }: { state: ClubActionNoticeState; testID: string; onLogin: () => void }): React.ReactElement | null {
  const { t } = useI18n();
  if (state === 'login') {
    return <InlineNotice testID={testID} tone="info" message={t('clubs.notice.login')} actionLabel={t('action.login')} onAction={onLogin} />;
  }
  if (state === 'denied') {
    return <InlineNotice testID={testID} tone="danger" message={t('clubs.notice.denied')} />;
  }
  if (state === 'failed') {
    return <InlineNotice testID={testID} tone="danger" message={t('clubs.notice.failed')} />;
  }
  return null;
}

type ClubActivityPreview = { id: number; title: string };
type ClubPostPreview = { id: number; content: string };

function profileActivities(value: readonly unknown[]): readonly ClubActivityPreview[] {
  return value.flatMap((row) => {
    const data = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
    return data && Number.isSafeInteger(data.id) && Number(data.id) > 0 && typeof data.title === 'string'
      ? [{ id: Number(data.id), title: data.title }]
      : [];
  });
}

function profilePosts(value: readonly unknown[]): readonly ClubPostPreview[] {
  return value.flatMap((row) => {
    const data = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
    return data && Number.isSafeInteger(data.id) && Number(data.id) > 0 && typeof data.content === 'string'
      ? [{ id: Number(data.id), content: data.content }]
      : [];
  });
}

type MyClub = { id: number; name: string; description: string; followers: number; role: 'admin' | 'member' };

function readMyClubs(value: unknown): readonly MyClub[] {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray((value as { list?: unknown }).list)) {
    throw new Error('Invalid my clubs');
  }
  return (value as { list: unknown[] }).list.map((row) => {
    const item = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
    if (!item || !Number.isSafeInteger(item.id) || Number(item.id) <= 0 || typeof item.name !== 'string' || typeof item.description !== 'string' || !Number.isSafeInteger(item.followers) || Number(item.followers) < 0 || (item.role !== 'admin' && item.role !== 'member')) throw new Error('Invalid my clubs');
    return { id: Number(item.id), name: item.name, description: item.description, followers: Number(item.followers), role: item.role };
  });
}

const CATEGORY_LABELS: Record<ClubCategory, MessageKey> = {
  music: 'clubs.category.music',
  tech: 'clubs.category.tech',
  culture: 'clubs.category.culture',
  sport: 'clubs.category.sport',
  art: 'clubs.category.art',
};

export function ClubDiscoveryScreen({ embedded = false }: { embedded?: boolean } = {}): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: true } });
  const [rows, setRows] = React.useState<readonly ClubSummary[]>([]);
  const page = React.useRef(0);
  const pending = React.useRef(false);
  const generation = React.useRef(0);
  const [queryInput, setQueryInput] = React.useState('');
  const query = React.useRef('');
  const [category, setCategory] = React.useState<ClubCategory | null>(null);
  const categoryRef = React.useRef<ClubCategory | null>(null);

  const load = React.useCallback(async (mode: 'refresh' | 'append') => {
    if (mode === 'append' && (pending.current || !pagination.hasMore)) return;
    // refresh 永远放行并作废旧请求；pending 只防翻页重复（对齐食堂检索的竞争丢弃）
    const issue = ++generation.current;
    if (mode === 'append') pending.current = true;
    const nextPage = mode === 'refresh' ? 1 : page.current + 1;
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const data = readClubPage(await listClubs({
        page: nextPage,
        pageSize: 20,
        ...(query.current ? { q: query.current } : {}),
        ...(categoryRef.current ? { category: categoryRef.current } : {}),
      }));
      if (issue !== generation.current) return;
      page.current = nextPage;
      setRows((current) => {
        if (mode === 'refresh') return data.rows;
        return [...new Map([...current, ...data.rows].map((row) => [row.id, row])).values()];
      });
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: data.hasMore });
    } catch (error) {
      if (issue === generation.current) dispatch({ type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: appError(error) });
    } finally {
      if (issue === generation.current) pending.current = false;
    }
  }, [dispatch, pagination.hasMore]);

  React.useEffect(() => {
    void load('refresh');
  }, [load]);

  const submitQuery = (): void => {
    const next = queryInput.trim();
    if (next === query.current) return;
    query.current = next;
    void load('refresh');
  };

  const changeQueryInput = (next: string): void => {
    setQueryInput(next);
    if (next === '' && query.current !== '') {
      query.current = '';
      void load('refresh');
    }
  };

  const toggleCategory = (key: string): void => {
    const next = categoryRef.current === key ? null : (CLUB_CATEGORIES.includes(key as ClubCategory) ? (key as ClubCategory) : null);
    categoryRef.current = next;
    setCategory(next);
    void load('refresh');
  };

  return (
    <FeatureScreen embedded={embedded} titleKey="clubs.title" showMailbox={false} testID="clubs-screen">
      <View style={{ paddingHorizontal: theme.space('space_4'), paddingTop: theme.space('space_2') }}>
        <SearchField
          testID="club-search"
          value={queryInput}
          onChangeText={changeQueryInput}
          onSubmit={submitQuery}
          placeholder={t('clubs.search.placeholder')}
        />
      </View>
      <UnderlineFilter
        testID="club-filter"
        options={[{ key: 'all', labelKey: 'action.all' }, ...CLUB_CATEGORIES.map((key) => ({ key, labelKey: CATEGORY_LABELS[key] }))]}
        selectedKey={category ?? 'all'}
        onSelect={(key) => { if (key !== (category ?? 'all')) toggleCategory(key); }}
      />
      <ListScreen
        testID="club-list"
        data={rows}
        keyExtractor={(row) => String(row.id)}
        pagination={pagination}
        onRefresh={() => void load('refresh')}
        onEndReached={() => void load('append')}
        onRetryRefresh={() => void load('refresh')}
        onRetryAppend={() => void load('append')}
        labels={{
          retryLabel: t('action.retry'),
          endLabel: t('screen.list.end'),
          empty: { kind: 'noResult', title: t('clubs.empty'), actionLabel: t('action.refresh'), onAction: () => void load('refresh') },
        }}
        renderItem={(club) => (
          <ListItem
            testID={`club-list-row-${club.id}`}
            title={club.name}
            subtitle={t(club.followers === 1 ? 'clubs.followers.one' : 'clubs.followers', { n: club.followers })}
            variant="nav"
            onPress={() => router.push(`/clubs/${club.id}` as never)}
          />
        )}
      />
    </FeatureScreen>
  );
}

export function ClubProfileScreen({ clubId }: { clubId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const id = asPositiveId(clubId);
  const [profile, setProfile] = React.useState<ClubProfile | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<{ kind: 'content' | 'permission' | 'signin' | 'unreachable' | 'unknown' } | null>(id === null ? { kind: 'content' } : null);
  const follow = useClubFollow({
    clubId: id ?? 0,
    following: profile?.basicInfo.viewer.following ?? false,
    followers: profile?.basicInfo.followers ?? 0,
  });

  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(readClubProfile(await getClubProfile(id)));
    } catch (cause) {
      setProfile(null);
      setError(appError(cause));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const backToDiscovery = (): void => router.replace('/clubs' as never);
  if (id === null) {
    return (
      <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-unavailable">
        <EmptyState kind="noResult" title={t('clubs.unavailable')} actionLabel={t('clubs.back')} onAction={backToDiscovery} />
        <Button testID="club-profile-back" label={t('clubs.back')} variant="link" onPress={backToDiscovery} />
      </Screen>
    );
  }
  if (loading) return <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-loading"><LoadingState /></Screen>;
  if (error || profile === null) {
    return (
      <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-error">
        <ErrorState error={error ?? { kind: 'unknown' }} onAction={() => void load()} />
      </Screen>
    );
  }

  const { basicInfo, joinInfo, members } = profile;
  const activities = profileActivities(profile.activities);
  const posts = profilePosts(profile.posts);
  return (
    <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile">
      <View style={{ gap: theme.space('space_3') }}>
        <Text role="title" emphasis="strong">{basicInfo.name}</Text>
        <Text role="body">{basicInfo.description}</Text>
        <Text testID="club-profile-followers" role="body">{t(follow.followers === 1 ? 'clubs.followers.one' : 'clubs.followers', { n: follow.followers })}</Text>
        <Button
          testID="club-profile-follow"
          label={t(follow.following ? 'clubs.unfollow' : 'clubs.follow')}
          disabled={follow.state === 'working'}
          onPress={() => void follow.toggle()}
        />
        <ClubActionNotice state={follow.state} testID="club-profile-follow-notice" onLogin={() => router.push('/login')} />
        {joinInfo.contactText ? <Text role="body">{joinInfo.contactText}</Text> : null}
        <Text role="caption">{t('clubs.members', { n: members.length })}</Text>
        {activities.length > 0 ? <Text role="headline">{t('clubs.activities')}</Text> : null}
        {activities.map((activity) => (
          <ListItem key={activity.id} testID={`club-profile-activity-${activity.id}`} title={activity.title} onPress={() => router.push(`/clubs/activity/${activity.id}` as never)} />
        ))}
        {posts.length > 0 ? <Text role="headline">{t('clubs.posts')}</Text> : null}
        {posts.map((post) => (
          <ListItem key={post.id} testID={`club-profile-post-${post.id}`} title={post.content} onPress={() => router.push(`/clubs/post/${post.id}` as never)} />
        ))}
        {basicInfo.viewer.canManage ? (
          <Button testID="club-profile-manage" label={t('clubs.manage')} variant="secondary" onPress={() => router.push(`/clubs/${profile.id}/manage` as never)} />
        ) : null}
      </View>
    </Screen>
  );
}

export function MyClubsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const [rows, setRows] = React.useState<readonly MyClub[] | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(null);
  const load = React.useCallback(async () => {
    setRows(null); setError(null);
    try { setRows(readMyClubs(await listMyClubs())); }
    catch (cause) { setError(appError(cause)); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const displayRows = rows ?? [];
  return (
    <Screen titleKey="clubs.my" showMailbox={false} testID="my-clubs-screen">
      {rows === null && error === null ? <LoadingState /> : error ? <ErrorState error={error} onAction={() => void load()} /> : displayRows.length === 0 ? <EmptyState kind="noResult" title={t('clubs.myEmpty')} actionLabel={t('action.refresh')} onAction={() => void load()} /> : (
        <View style={{ gap: theme.space('space_2') }}>
          {displayRows.map((club) => <Button key={club.id} testID={`my-club-row-${club.id}`} label={`${club.name} · ${t(club.followers === 1 ? 'clubs.followers.one' : 'clubs.followers', { n: club.followers })}`} variant="secondary" fullWidth onPress={() => router.push(`/clubs/${club.id}` as never)} />)}
        </View>
      )}
    </Screen>
  );
}

export function ClubManageScreen({ clubId }: { clubId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const id = asPositiveId(clubId);
  const [profile, setProfile] = React.useState<ClubProfile | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(id === null ? { kind: 'content' } : null);
  const [removing, setRemoving] = React.useState<ClubProfile['members'][number] | null>(null);
  const [actionError, setActionError] = React.useState<ClubActionNoticeState | null>(null);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'member' | 'admin'>('member');
  const [inviteError, setInviteError] = React.useState<'missing' | ClubActionNoticeState | null>(null);
  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError(null);
    try { setProfile(readClubProfile(await getClubProfile(id))); }
    catch (cause) { setProfile(null); setError(appError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const back = (): void => router.replace(id === null ? '/clubs' as never : `/clubs/${id}` as never);
  const mutate = async (operation: () => Promise<unknown>): Promise<void> => {
    setActionError(null);
    try {
      const acknowledgement = await operation();
      if (!acknowledgement || typeof acknowledgement !== 'object' || (acknowledgement as { status?: unknown }).status !== 0) throw new Error('Invalid management acknowledgement');
      await load();
    } catch (cause) {
      const failure = classifyAuthFailure(cause);
      setActionError(isSessionInvalid(failure) ? 'login' : failure === 'sanctioned' ? 'denied' : 'failed');
    }
  };
  if (id === null) {
    return <Screen titleKey="clubs.manage" showMailbox={false} testID="club-manage-unavailable"><EmptyState kind="noResult" title={t('clubs.unavailable')} actionLabel={t('clubs.back')} onAction={back} /></Screen>;
  }
  if (loading) return <Screen titleKey="clubs.manage" showMailbox={false}><LoadingState /></Screen>;
  if (error || profile === null) {
    return <Screen titleKey="clubs.manage" showMailbox={false} testID="club-manage-unavailable"><ErrorState error={error ?? { kind: 'unknown' }} onAction={() => void load()} /></Screen>;
  }
  const managedProfile = profile;
  const invite = async (): Promise<void> => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteError(null);
    try {
      const acknowledgement = await addClubMember(managedProfile.id, email, inviteRole);
      if (!acknowledgement || typeof acknowledgement !== 'object' || (acknowledgement as { status?: unknown }).status !== 0) throw new Error('Invalid invite acknowledgement');
      setInviteEmail('');
      await load();
    } catch (cause) {
      if ((cause as { status?: unknown } | null)?.status === 404) { setInviteError('missing'); return; }
      const failure = classifyAuthFailure(cause);
      setInviteError(isSessionInvalid(failure) ? 'login' : failure === 'sanctioned' ? 'denied' : 'failed');
    }
  };
  if (!managedProfile.basicInfo.viewer.canManage) {
    return <Screen titleKey="clubs.manage" showMailbox={false} testID="club-manage-denied"><EmptyState kind="broken" title={t('clubs.manageDenied')} actionLabel={t('clubs.back')} onAction={back} /><Button testID="club-manage-back" label={t('clubs.back')} variant="link" onPress={back} /></Screen>;
  }
  const activities = profileActivities(managedProfile.activities);
  const posts = profilePosts(managedProfile.posts);
  return (
    <Screen titleKey="clubs.manage" showMailbox={false} testID="club-manage">
      <View style={{ gap: theme.space('space_3') }}>
        <Text role="title" emphasis="strong">{managedProfile.basicInfo.name}</Text>
        {actionError ? <ClubActionNotice state={actionError} testID="club-manage-notice" onLogin={() => router.push('/login')} /> : null}
        <Input
          testID="club-manage-invite-input"
          kind="email"
          value={inviteEmail}
          onChangeText={(next) => { setInviteEmail(next); if (inviteError !== null) setInviteError(null); }}
          label={t('clubs.invite.label')}
          placeholder={t('clubs.invite.placeholder')}
          clearable
        />
        <SegmentedControl
          testID="club-manage-invite-role"
          value={inviteRole}
          onChange={(next) => setInviteRole(next === 'admin' ? 'admin' : 'member')}
          options={[
            { value: 'member', label: t('clubs.role.member') },
            { value: 'admin', label: t('clubs.role.admin') },
          ]}
        />
        <Button
          testID="club-manage-invite"
          label={t('clubs.invite.action')}
          disabled={!inviteEmail.trim()}
          onPress={() => void invite()}
        />
        {inviteError === 'missing' ? (
          <InlineNotice testID="club-manage-invite-error" tone="danger" message={t('clubs.invite.missing')} />
        ) : inviteError !== null ? (
          <ClubActionNotice state={inviteError} testID="club-manage-notice" onLogin={() => router.push('/login')} />
        ) : null}
        <Text role="headline">{t('clubs.members', { n: managedProfile.members.length })}</Text>
        {managedProfile.members.map((member) => <View key={member.id} testID={`club-manage-member-${member.id}`} style={{ gap: theme.space('space_1') }}><Text role="body">{member.nickname}</Text><Text role="caption" colorToken="text-muted">{t(member.role === 'admin' ? 'clubs.role.admin' : 'clubs.role.member')}</Text>{member.role === 'member' ? <Button testID={`club-manage-remove-${member.id}`} label={t('clubs.removeMember')} variant="danger" onPress={() => setRemoving(member)} /> : null}</View>)}
        {activities.map((activity) => <View key={activity.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}><View style={{ flex: 1 }}><Text role="body">{activity.title}</Text></View><Button testID={`club-manage-delete-activity-${activity.id}`} label={t('clubs.deleteActivity')} variant="danger" onPress={() => void mutate(() => deleteClubActivity(activity.id))} /></View>)}
        {posts.map((post) => <View key={post.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}><View style={{ flex: 1 }}><Text role="body">{post.content}</Text></View><Button testID={`club-manage-delete-post-${post.id}`} label={t('clubs.deletePost')} variant="danger" onPress={() => void mutate(() => deleteClubPost(post.id))} /></View>)}
      </View>
      <AlertDialog testID="club-manage-remove-dialog" visible={removing !== null} variant="danger" title={t('clubs.removeMember')} body={t('clubs.removeMemberBody')} confirmLabel={t('clubs.removeMember')} cancelLabel={t('action.cancel')} onCancel={() => setRemoving(null)} onConfirm={() => { const member = removing; setRemoving(null); if (member) void mutate(() => removeClubMember(managedProfile.id, member.id)); }} />
    </Screen>
  );
}

function detailLabels(t: ReturnType<typeof useI18n>['t']) {
  return {
    back: t('action.back'),
    like: t('square.guides.like'),
    favorite: t('action.save'),
    comment: t('square.guides.comments'),
    report: t('square.guides.more'),
    countPlaceholder: '—',
    anonymous: t('screen.campus.read.anonymous'),
    comments: {
      anonymous: t('screen.campus.read.anonymous'), deleteLabel: t('square.guides.delete'), replyLabel: t('square.guides.reply'),
      likeLabel: t('square.guides.like'), moreReplies: (count: number) => String(count), collapse: t('square.guides.collapse'),
    },
    commentsEnd: t('clubs.end'), commentsRetry: t('action.retry'),
  };
}

function ClubDetailState({
  detail,
  loading,
  error,
  onRetry,
  onBack,
  testID,
}: {
  detail: ClubActivityDetail | ClubPostDetail | null;
  loading: boolean;
  error: ReturnType<typeof appError> | null;
  onRetry: () => void;
  onBack: () => void;
  testID: string;
}): React.ReactElement | null {
  const { t } = useI18n();
  return (
    <DetailScreen
      testID={testID}
      title={t('clubs.title')}
      author={{ kind: 'named', name: t('clubs.title') }}
      interactions={{}}
      onBack={onBack}
      onRetry={onRetry}
      state={loading ? 'loading' : error?.kind === 'content' ? 'empty' : 'error'}
      error={error}
      empty={{ kind: 'noResult', title: t('clubs.unavailable'), actionLabel: t('clubs.back'), onAction: onBack }}
      labels={detailLabels(t)}
    />
  );
}

export function ClubActivityDetailScreen({ activityId }: { activityId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const session = useSession();
  const id = asPositiveId(activityId);
  const [detail, setDetail] = React.useState<ClubActivityDetail | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(id === null ? { kind: 'content' } : null);
  const registration = useClubActivityRegistration(id);
  const like = useClubLike({ targetType: 'activity', targetId: id ?? 0, liked: detail?.viewer.liked ?? false, count: detail?.stats.likes ?? 0 });
  const comments = useClubComments('activity', id ?? 0);
  const [exporting, setExporting] = React.useState(false);
  const [exportFailed, setExportFailed] = React.useState(false);
  React.useEffect(() => { setExporting(false); setExportFailed(false); }, [id]);
  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError(null);
    try { setDetail(readClubActivityDetail(await getActivityDetail(id))); }
    catch (cause) { setDetail(null); setError(appError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const back = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(detail ? `/clubs/${detail.clubId}` as never : '/clubs' as never);
  };
  if (detail === null) return <ClubDetailState detail={detail} loading={loading} error={error} onRetry={() => void load()} onBack={back} testID="club-activity-detail" />;
  const current = registration.snapshot ?? detail.registration;
  const exportRegistrations = async (): Promise<void> => {
    if (id === null || !detail.viewer.canManage || exporting) return;
    setExporting(true); setExportFailed(false);
    try { await exportClubActivityRegistrationsToDevice(id); }
    catch (error) {
      if (isSessionInvalid(classifyAuthFailure(error))) await session.handleAuthFailure(error);
      setExportFailed(true);
    }
    finally { setExporting(false); }
  };
  return (
    <DetailScreen
      testID="club-activity-detail"
      title={detail.title}
      author={{ kind: 'named', name: detail.clubName }}
      metaLabel={detail.time ?? undefined}
      onBack={back}
      onToggleLike={() => void like.toggle()}
      interactions={{ liked: like.liked, likeCount: like.count, commentCount: detail.stats.comments }}
      hero={detail.images.length > 0 ? <MediaGrid testID="club-activity-media" variant="hero" uris={detail.images} /> : undefined}
      body={<><ClubActionNotice state={like.state} testID="club-like-notice" onLogin={() => router.push('/login')} /><Text role="body">{detail.summary}</Text><Button testID="club-activity-registration" label={t(current.registered ? 'clubs.cancelRegistration' : 'clubs.register')} loading={registration.state === 'working'} onPress={() => void (current.registered ? registration.cancel() : registration.register())} /><Text testID="club-activity-registration-count" role="caption" colorToken="text-muted">{t('clubs.registrationCount', { n: current.count })}</Text><ClubActionNotice state={registration.state} testID="club-activity-registration-notice" onLogin={() => router.push('/login')} />{detail.viewer.canManage ? <><Button testID="club-activity-export-registrations" label={t('clubs.exportRegistrations')} loading={exporting} onPress={() => void exportRegistrations()} />{exportFailed ? <Text role="body" colorToken="text-danger">{t('clubs.exportFailed')}</Text> : null}</> : null}{comments.body}</>}
      comments={comments.comments}
      labels={detailLabels(t)}
    />
  );
}

export function ClubPostDetailScreen({ postId }: { postId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const id = asPositiveId(postId);
  const [detail, setDetail] = React.useState<ClubPostDetail | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(id === null ? { kind: 'content' } : null);
  const like = useClubLike({ targetType: 'post', targetId: id ?? 0, liked: detail?.viewer.liked ?? false, count: detail?.stats.likes ?? 0 });
  const comments = useClubComments('post', id ?? 0);
  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError(null);
    try { setDetail(readClubPostDetail(await getClubPostDetail(id))); }
    catch (cause) { setDetail(null); setError(appError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const back = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(detail ? `/clubs/${detail.clubId}` as never : '/clubs' as never);
  };
  if (detail === null) return <ClubDetailState detail={detail} loading={loading} error={error} onRetry={() => void load()} onBack={back} testID="club-post-detail" />;
  return (
    <DetailScreen
      testID="club-post-detail"
      title={detail.title}
      author={{ kind: 'named', name: detail.clubName }}
      metaLabel={detail.createdAt ?? undefined}
      onBack={back}
      onToggleLike={() => void like.toggle()}
      interactions={{ liked: like.liked, likeCount: like.count, commentCount: detail.stats.comments }}
      hero={detail.images.length > 0 ? <MediaGrid testID="club-post-media" variant="hero" uris={detail.images} /> : undefined}
      body={<><ClubActionNotice state={like.state} testID="club-like-notice" onLogin={() => router.push('/login')} /><Text role="body">{detail.content}</Text>{comments.body}</>}
      comments={comments.comments}
      labels={detailLabels(t)}
    />
  );
}
