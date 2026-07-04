import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getMyOrganizations } from '@shared/api/organizations';
import { QK } from '@shared/query/queryKeys';
import RouteTransition from '../components/ui/RouteTransition';
import FadeInSection from '../components/ui/FadeInSection';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/templates/PageHeader';
import SectionHeader from '../components/templates/SectionHeader';
import PublishEntryCard from '../components/publish/PublishEntryCard';
import PublishQuickActionSheet from '../components/publish/PublishQuickActionSheet';
import './PublishCenter.css';

function PublishCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [sheetState, setSheetState] = useState({ open: false, mode: 'post' });

  const orgQuery = useQuery({
    queryKey: QK.myOrganizations(),
    queryFn: getMyOrganizations,
    enabled: isLoggedIn,
    staleTime: 60 * 1000,
  });

  const organizations = useMemo(() => {
    const raw = Array.isArray(orgQuery.data) ? orgQuery.data : orgQuery.data?.data || [];
    return raw.filter((item) => item?.type === 'Club' || item?.type === 'StudentClub');
  }, [orgQuery.data]);

  const hasClubPublishAccess = organizations.length > 0;

  const openLogin = (fromPath) => {
    navigate('/login', { state: { from: { pathname: fromPath } } });
  };

  const goTo = (path) => {
    if (!isLoggedIn) {
      openLogin(path);
      return;
    }
    navigate(path);
  };

  const handleClubEntry = (mode) => {
    if (!isLoggedIn) {
      openLogin('/publish');
      return;
    }
    if (!hasClubPublishAccess) {
      Toast.error(isZh ? '你当前没有社团发布权限' : 'No club publish permission');
      return;
    }
    if (organizations.length === 1) {
      const clubId = organizations[0].id;
      navigate(mode === 'activity' ? `/about/club/activity/new?clubId=${clubId}` : `/about/club/post/new?clubId=${clubId}`);
      return;
    }
    setSheetState({ open: true, mode });
  };

  const sheetOptions = useMemo(
    () =>
      organizations.map((org) => ({
        key: String(org.id),
        title: org.name,
        description: org.title || (isZh ? '选择此身份继续发布' : 'Continue with this identity'),
        clubId: org.id,
      })),
    [isZh, organizations]
  );

  useEffect(() => {
    const entry = searchParams.get('entry');
    if (!entry) return;
    if ((entry === 'club-post' || entry === 'club-activity') && orgQuery.isLoading) return;
    if (entry === 'treehole') goTo('/post/new');
    if (entry === 'marketplace') goTo('/about/second-hand/new');
    if (entry === 'errand') goTo('/about/errands/new');
    if (entry === 'club-post') handleClubEntry('post');
    if (entry === 'club-activity') handleClubEntry('activity');
  }, [searchParams, isLoggedIn, hasClubPublishAccess, orgQuery.isLoading]);

  const primaryEntries = [
    {
      key: 'treehole',
      icon: '✍️',
      title: isZh ? '发树洞' : 'Post to TreeHole',
      description: isZh ? '匿名分享心情、问题和校园日常。' : 'Post anonymous campus thoughts and updates.',
      meta: isZh ? '文字 + 最多 3 张图片' : 'Text + up to 3 images',
      onClick: () => goTo('/post/new'),
    },
    {
      key: 'marketplace',
      icon: '🛍️',
      title: isZh ? '发二手' : 'Publish item',
      description: isZh ? '快速上架闲置物品，直接进入交易页。' : 'List your second-hand item in one step.',
      meta: isZh ? '价格 / 分类 / 宿舍区域' : 'Price / category / dorm area',
      onClick: () => goTo('/about/second-hand/new'),
    },
    {
      key: 'errand',
      icon: '🤝',
      title: isZh ? '发跑腿' : 'Publish errand',
      description: isZh ? '发布代取、代购和紧急求助。' : 'Create delivery, purchase, or urgent errands.',
      meta: isZh ? '标题 / 酬劳 / 联系方式' : 'Title / reward / contact',
      onClick: () => goTo('/about/errands/new'),
    },
  ];

  const clubEntries = [
    {
      key: 'club-post',
      icon: '🎯',
      title: isZh ? '发社团日常' : 'Club post',
      description: isZh ? '用社团身份发布日常动态。' : 'Post updates using your club identity.',
      meta: hasClubPublishAccess
        ? isZh
          ? `可用身份 ${organizations.length} 个`
          : `${organizations.length} identities available`
        : isZh
          ? '仅社团管理员可见'
          : 'Club managers only',
      badge: hasClubPublishAccess ? (isZh ? '社团' : 'Club') : null,
      hidden: !hasClubPublishAccess,
      onClick: () => handleClubEntry('post'),
    },
    {
      key: 'club-activity',
      icon: '📅',
      title: isZh ? '发活动' : 'Publish activity',
      description: isZh ? '创建活动时间、地点和报名入口。' : 'Create an activity with time, place, and signup link.',
      meta: hasClubPublishAccess
        ? isZh
          ? `可用身份 ${organizations.length} 个`
          : `${organizations.length} identities available`
        : isZh
          ? '仅社团管理员可见'
          : 'Club managers only',
      badge: hasClubPublishAccess ? (isZh ? '活动' : 'Activity') : null,
      hidden: !hasClubPublishAccess,
      onClick: () => handleClubEntry('activity'),
    },
  ].filter((item) => !item.hidden);

  return (
    <RouteTransition className="publish-center-page">
      <div className="publish-center-shell">
        <FadeInSection delay={0}>
          <AppCard className="publish-center-hero" strong>
            <PageHeader
              eyebrow={isZh ? '统一发布入口' : 'Unified publish center'}
              title={isZh ? '你想发什么？' : 'What do you want to publish?'}
              description={
                isZh
                  ? '把常用发布能力集中到一个页面里，减少来回找入口。'
                  : 'All common publishing actions live here, so you do not need to hunt for entry points.'
              }
              meta={[
                isZh ? '树洞 / 二手 / 跑腿 / 社团' : 'TreeHole / marketplace / errands / clubs',
              ]}
            />
          </AppCard>
        </FadeInSection>

        <FadeInSection delay={0.04}>
          <section className="publish-center-section">
            <SectionHeader
              title={isZh ? '校园内容' : 'Campus content'}
              description={isZh ? '面向所有用户开放的基础发布能力。' : 'Core publish actions available to all users.'}
            />
            <div className="publish-center-grid">
              {primaryEntries.map((entry) => (
                <PublishEntryCard key={entry.key} {...entry} />
              ))}
            </div>
          </section>
        </FadeInSection>

        <FadeInSection delay={0.08}>
          <section className="publish-center-section">
            <SectionHeader
              title={isZh ? '组织与活动' : 'Organizations and events'}
              description={
                hasClubPublishAccess
                  ? isZh
                    ? '系统会根据你的身份自动筛选可发布的社团入口。'
                    : 'Club entries are filtered automatically by your permissions.'
                  : isZh
                    ? '社团发布入口仅在你具备对应身份时显示。'
                    : 'Club entries appear only when you have the required role.'
              }
            />
            {orgQuery.isLoading && isLoggedIn ? (
              <div className="state-loading publish-center-state">Loading…</div>
            ) : orgQuery.isError && isLoggedIn ? (
              <AppCard className="publish-center-tip">
                <p className="publish-center-tip__text">
                  {isZh
                    ? '社团身份加载失败，请稍后重试后再进入社团发布。'
                    : 'Failed to load club identities. Please try again before opening club publishing.'}
                </p>
              </AppCard>
            ) : clubEntries.length > 0 ? (
              <div className="publish-center-grid">
                {clubEntries.map((entry) => (
                  <PublishEntryCard key={entry.key} {...entry} />
                ))}
              </div>
            ) : (
              <AppCard className="publish-center-tip">
                <p className="publish-center-tip__text">
                  {isZh
                    ? '当前账号暂无社团发布权限。你仍然可以使用树洞、二手和跑腿发布。'
                    : 'This account does not have club publishing permissions yet. TreeHole, marketplace, and errands are still available.'}
                </p>
              </AppCard>
            )}
          </section>
        </FadeInSection>

        <FadeInSection delay={0.12}>
          <AppCard className="publish-center-footer">
            <p className="publish-center-footer__text">
              {isZh
                ? '如果后续增加课程评价、食堂点评等投稿入口，可以继续接入这里，不需要重做业务接口。'
                : 'Future actions like course reviews or canteen submissions can plug in here without changing backend business flows.'}
            </p>
          </AppCard>
        </FadeInSection>
      </div>

      <PublishQuickActionSheet
        open={sheetState.open}
        title={sheetState.mode === 'activity' ? (isZh ? '选择发布活动的社团身份' : 'Choose a club for activity publishing') : (isZh ? '选择发布日常的社团身份' : 'Choose a club for posting')}
        subtitle={isZh ? '请选择一个社团身份继续。' : 'Pick one club identity to continue.'}
        options={sheetOptions}
        onClose={() => setSheetState({ open: false, mode: 'post' })}
        onSelect={(option) => {
          setSheetState({ open: false, mode: 'post' });
          navigate(
            sheetState.mode === 'activity'
              ? `/about/club/activity/new?clubId=${option.clubId}`
              : `/about/club/post/new?clubId=${option.clubId}`
          );
        }}
      />
    </RouteTransition>
  );
}

export default PublishCenter;
