import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Gauge,
  MapPin,
  LogIn,
  LogOut,
  NotebookText,
  Info,
  Mail,
  ShieldAlert,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getProfile } from '@shared/api/users';
import { getMyFavorites, getMyProductReviews } from '@shared/api/canteen';
import { getScheduleWeek } from '@shared/api/schedule';
import { getTodos } from '@shared/api/todos';
import {
  formatTodoDueDisplay,
  normalizeTodoDueDate,
  normalizeTodoDueTime,
} from '@shared/utils/formatTodoDue';
import UserLevelBadge from '../components/UserLevelBadge';
import LevelProgressBar from '../components/LevelProgressBar';

function MyZoneStrings(isZh) {
  return {
    title: isZh ? '我的' : 'Profile',
    bioLoggedOut: isZh ? '登录后查看你的内容与工具入口。' : 'Log in to view your content and tools.',
    bioLoggedIn: isZh ? '欢迎回来，祝你今天也顺利。' : 'Welcome back. Have a great day.',
    statsPosts: isZh ? '帖子' : 'Posts',
    statsReviews: isZh ? '点评' : 'Reviews',
    statsFavorites: isZh ? '收藏' : 'Favorites',
    currentCourse: isZh ? '当前课程' : 'Current course',
    utilities: isZh ? '工具' : 'Utilities',
    canteen: isZh ? '食堂' : 'Canteen',
    schedule: isZh ? '课程表' : 'Schedule',
    diary: isZh ? '多年日记本' : 'Diary',
    todo: 'Todo',
    more: isZh ? '更多' : 'More',
    aboutProfile: isZh ? '关于我们' : 'About us',
    aboutThanks: isZh ? '特别鸣谢' : 'Special Thanks',
    aboutDisclaimer: isZh ? '免责声明' : 'Disclaimer',
    aboutContact: isZh ? '联系我们' : 'Contact us',
    storeManage: isZh ? '店铺管理' : 'Store management',
    editProfile: isZh ? '编辑资料' : 'Edit profile',
    logOut: isZh ? '退出登录' : 'Log out',
    logIn: isZh ? '登录' : 'Log in',
  };
}

const tap = { whileTap: { scale: 0.97 } };

const listContainer = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.06 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

function softIcon(bg, fg) {
  return { backgroundColor: bg, color: fg };
}

function getTodayDayOfWeek() {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

function toMinutes(hhmm) {
  if (!hhmm) return Number.NaN;
  const s = String(hhmm).slice(0, 5);
  const [h, m] = s.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
}

function getTodoSortValue(todo) {
  const dueDate = normalizeTodoDueDate(todo.due_date);
  const dueTime = normalizeTodoDueTime(todo.due_time);
  if (!dueDate) return Number.MAX_SAFE_INTEGER;
  return new Date(`${dueDate}T${dueTime || '23:59'}:00`).getTime();
}

function MyZone() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = MyZoneStrings(isZh);

  const { isLoggedIn, isMerchant, isAdmin, displayName, displayAvatar, user, userLoading, logout } = useAuth();
  const userId = user?.id ? Number(user.id) : 0;

  const goLogin = () => navigate('/login', { state: { from: { pathname: '/myzone' } } });
  const goProfile = () => {
    if (!isLoggedIn) return goLogin();
    navigate('/myzone/profile');
  };
  const goSpace = () => {
    if (!isLoggedIn || !userId) return goLogin();
    navigate(`/user/${userId}`);
  };
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const scheduleTodayQuery = useQuery({
    queryKey: ['myzone', 'scheduleWeek', 1],
    enabled: isLoggedIn,
    queryFn: () => getScheduleWeek(1),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const currentCourse = useMemo(() => {
    if (!isLoggedIn) return null;
    const weekData = scheduleTodayQuery.data ?? null;
    const days = weekData?.days || {};
    const dow = getTodayDayOfWeek();
    const todayRaw = Array.isArray(days[dow]) ? days[dow] : [];
    const todayList = [...todayRaw].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    if (todayList.length === 0) return null;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const match = todayList.find((course) => {
      const st = toMinutes(course.start_time);
      const et = toMinutes(course.end_time);
      if (!Number.isFinite(st) || !Number.isFinite(et)) return false;
      return nowMin <= et;
    });
    return match || todayList[0];
  }, [isLoggedIn, scheduleTodayQuery.data]);

  const postsCountQuery = useQuery({
    queryKey: ['myzone', 'postCount', userId],
    enabled: isLoggedIn && !!userId,
    queryFn: async () => {
      const data = await getProfile(userId, { page: 1, pageSize: 1 });
      const cnt = data?.stats?.post_count;
      return Number.isFinite(Number(cnt)) ? Number(cnt) : Number(data?.post_count ?? 0);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const reviewsCountQuery = useQuery({
    queryKey: ['myzone', 'reviewsCount'],
    enabled: isLoggedIn,
    queryFn: async () => {
      const data = await getMyProductReviews({ page: 1, pageSize: 1 });
      const total = data?.total ?? data?.count ?? data?.pagination?.total;
      if (Number.isFinite(Number(total))) return Number(total);
      const list = data?.list ?? [];
      return Array.isArray(list) ? list.length : 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const favoritesCountQuery = useQuery({
    queryKey: ['myzone', 'favoritesCount'],
    enabled: isLoggedIn,
    queryFn: async () => {
      const data = await getMyFavorites({ page: 1, pageSize: 1 });
      const total = data?.total ?? data?.count ?? data?.pagination?.total;
      if (Number.isFinite(Number(total))) return Number(total);
      const list = data?.list ?? [];
      return Array.isArray(list) ? list.length : 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const stats = useMemo(() => {
    const posts = isLoggedIn ? (postsCountQuery.data ?? 0) : 0;
    const reviews = isLoggedIn ? (reviewsCountQuery.data ?? 0) : 0;
    const favorites = isLoggedIn ? (favoritesCountQuery.data ?? 0) : 0;
    return [
      { key: 'posts', value: posts, label: t.statsPosts, to: isLoggedIn ? `/user/${userId}` : '/login' },
      { key: 'reviews', value: reviews, label: t.statsReviews, to: isLoggedIn ? `/user/${userId}` : '/login' },
      { key: 'favorites', value: favorites, label: t.statsFavorites, to: isLoggedIn ? `/user/${userId}` : '/login' },
    ];
  }, [favoritesCountQuery.data, isLoggedIn, postsCountQuery.data, reviewsCountQuery.data, t.statsFavorites, t.statsPosts, t.statsReviews, userId]);

  return (
    <div className="h-full w-full bg-[#F9FAFB]">
      <div className="h-full overflow-y-auto px-4 pb-[calc(var(--tabbar-height)+var(--safe-bottom)+24px)] pt-6">
        <motion.div variants={listContainer} initial="hidden" animate="show">
          <motion.section
            variants={listItem}
            aria-label={isZh ? '个人信息' : 'Profile header'}
            className="rounded-3xl bg-white p-5 shadow-sm"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
          >
            <div className="flex items-start gap-5">
              <motion.button
                type="button"
                onClick={isLoggedIn ? goProfile : goLogin}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100"
                style={{ boxShadow: '0 8px 26px rgba(15, 23, 42, 0.10)' }}
                aria-label={isLoggedIn ? t.editProfile : t.logIn}
                {...tap}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <img src="/default-avatar.svg" alt="" className="h-full w-full object-cover opacity-90" />
                )}
                {userLoading && !displayAvatar ? (
                  <div className="absolute inset-0 grid place-items-center text-[11px] font-medium text-slate-500">
                    ...
                  </div>
                ) : null}
              </motion.button>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[18px] font-semibold text-slate-900">
                    {isLoggedIn ? displayName : t.logIn}
                  </p>
                  {isLoggedIn && user?.level ? (
                    <UserLevelBadge level={user.level} badgeEmoji={user.badgeEmoji} size="md" isZh={isZh} />
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                  {isLoggedIn ? t.bioLoggedIn : t.bioLoggedOut}
                </p>
                <LevelProgressBar level={user?.level} levelProgress={user?.levelProgress} isZh={isZh} />
              </div>

              <motion.button
                type="button"
                onClick={goSpace}
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200"
                {...tap}
              >
                {isZh ? '空间' : 'Space'}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </motion.button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <motion.div key={s.key} variants={listItem}>
                  <motion.div {...tap}>
                    <Link to={s.to} className="block rounded-2xl bg-white px-2 py-3 text-center" aria-label={s.label}>
                      <div className="text-[20px] font-semibold text-slate-900 tabular-nums">
                        {Number(s.value) || 0}
                      </div>
                      <div className="mt-0.5 text-[12px] font-medium text-slate-400">{s.label}</div>
                    </Link>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={listItem} className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">{t.currentCourse}</h2>
            </div>

            <CurrentCourseCard isLoggedIn={isLoggedIn} course={currentCourse} loading={scheduleTodayQuery.isFetching} to="/myzone/schedule" />
          </motion.section>

          {isLoggedIn && <TodoPreview />}

          <motion.section
            variants={listItem}
            className="mt-5 rounded-3xl bg-white p-4 shadow-sm"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
          >
            <h2 className="px-1 pb-2 text-[15px] font-semibold text-slate-900">{t.utilities}</h2>
            <div className="grid grid-cols-2 gap-2">
              <UtilityTile to="/eat" title={t.canteen} icon={<UtensilsCrossed className="h-5 w-5" />} iconStyle={softIcon('rgba(59,130,246,0.12)', 'rgb(37,99,235)')} />
              <UtilityTile to="/myzone/schedule" title={t.schedule} icon={<CalendarDays className="h-5 w-5" />} iconStyle={softIcon('rgba(34,197,94,0.12)', 'rgb(22,163,74)')} />
              <UtilityTile to="/myzone/diary" title={t.diary} icon={<NotebookText className="h-5 w-5" />} iconStyle={softIcon('rgba(168,85,247,0.12)', 'rgb(147,51,234)')} />
              <UtilityTile to="/myzone/todos" title={t.todo} icon={<Star className="h-5 w-5" />} iconStyle={softIcon('rgba(234,179,8,0.14)', 'rgb(202,138,4)')} />
              {isLoggedIn && isMerchant && (
                <UtilityTile to="/merchant/manage" title={t.storeManage} icon={<Store className="h-5 w-5" />} iconStyle={softIcon('rgba(99,102,241,0.12)', 'rgb(79,70,229)')} />
              )}
              {isLoggedIn && isAdmin && (
                <UtilityTile to="/myzone/admin" title={isZh ? '管理员后台' : 'Admin Panel'} icon={<Gauge className="h-5 w-5" />} iconStyle={softIcon('rgba(15,23,42,0.10)', 'rgb(15,23,42)')} />
              )}
            </div>
          </motion.section>

          <motion.section
            variants={listItem}
            className="mt-5 rounded-3xl bg-white p-4 shadow-sm"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
          >
            <h2 className="px-1 pb-2 text-[15px] font-semibold text-slate-900">{t.more}</h2>
            <div className="divide-y divide-slate-100">
              <MoreRow to="/about/profile" title={t.aboutProfile} icon={<Info className="h-5 w-5" />} iconStyle={softIcon('rgba(59,130,246,0.12)', 'rgb(37,99,235)')} />
              <MoreRow to="/about/thanks" title={t.aboutThanks} icon={<Sparkles className="h-5 w-5" />} iconStyle={softIcon('rgba(244,63,94,0.12)', 'rgb(225,29,72)')} />
              <MoreRow to="/about/disclaimer" title={t.aboutDisclaimer} icon={<ShieldAlert className="h-5 w-5" />} iconStyle={softIcon('rgba(234,179,8,0.14)', 'rgb(202,138,4)')} />
              <MoreRow to="/about/contact" title={t.aboutContact} icon={<Mail className="h-5 w-5" />} iconStyle={softIcon('rgba(34,197,94,0.12)', 'rgb(22,163,74)')} />
            </div>
          </motion.section>

          <motion.div variants={listItem} className="mt-5 flex gap-3">
            {isLoggedIn ? (
              <>
                <motion.button type="button" onClick={goProfile} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-sm" {...tap}>
                  {t.editProfile}
                </motion.button>
                <motion.button type="button" onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200" {...tap}>
                  <LogOut className="h-4 w-4" />
                  {t.logOut}
                </motion.button>
              </>
            ) : (
              <motion.button type="button" onClick={goLogin} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-sm" {...tap}>
                <LogIn className="h-4 w-4" />
                {t.logIn}
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function TodoPreview() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const { data } = useQuery({
    queryKey: ['todos', 'preview'],
    queryFn: () => getTodos({ status: 'active', pageSize: 20 }),
    staleTime: 30 * 1000,
  });

  const rawTodos = data?.data?.list || data?.list || data?.data || [];
  const topItems = [...rawTodos]
    .sort((a, b) => {
      const timeDiff = getTodoSortValue(a) - getTodoSortValue(b);
      if (timeDiff !== 0) return timeDiff;
      if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })
    .slice(0, 2);
  const active = rawTodos.length;

  if (active === 0 && topItems.length === 0) {
    return (
      <motion.section className="mt-5 rounded-3xl bg-white p-4 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] font-semibold text-slate-900">Todo</h2>
          <button type="button" onClick={() => navigate('/myzone/todos')} className="text-[13px] text-blue-600 font-medium">
            {isZh ? '添加' : 'Add'}
          </button>
        </div>
        <p className="px-1 pt-3 text-[13px] text-slate-400">
          {isZh ? '还没有待办事项' : 'No todos yet'}
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section className="mt-5 rounded-3xl bg-white p-4 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-slate-900">Todo ({active})</h2>
        <button type="button" onClick={() => navigate('/myzone/todos')} className="text-[13px] font-medium text-blue-600">
          {isZh ? '查看全部' : 'View all'} →
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {topItems.map((item) => (
          <div key={item.id} className="flex cursor-pointer items-center gap-2 py-2" onClick={() => navigate('/myzone/todos')}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: item.priority >= 3 ? '#f44336' : item.priority >= 2 ? '#ff9800' : '#e0e0e0', flexShrink: 0 }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-slate-700">{item.title}</p>
              {formatTodoDueDisplay(item.due_date, item.due_time) && (
                <p className="text-[11px] text-slate-400">
                  {isZh ? '截止 ' : 'Due '}
                  {formatTodoDueDisplay(item.due_date, item.due_time)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function CurrentCourseCard({ isLoggedIn, course, loading, to }) {
  const hasCourse = !!course;
  const name = course?.course_name || course?.courseName || '';
  const venue = course?.venue || course?.location || '';
  const st = course?.start_time ? String(course.start_time).slice(0, 5) : '';
  const et = course?.end_time ? String(course.end_time).slice(0, 5) : '';
  const timeLabel = st && et ? `${st}-${et}` : '';

  return (
    <motion.div className="rounded-3xl bg-white p-4 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
      <Link to={to} className="block">
        {loading ? (
          <div className="h-[96px] animate-pulse rounded-2xl bg-slate-50" />
        ) : !isLoggedIn ? (
          <div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-4 ring-1 ring-slate-100">
            <div>
              <div className="text-[14px] font-semibold text-slate-900">Schedule</div>
              <div className="mt-1 text-[12px] font-medium text-slate-400">Log in to view today&apos;s classes</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        ) : hasCourse ? (
          <div className="flex items-start justify-between rounded-2xl bg-[#F9FAFB] px-4 py-4 ring-1 ring-slate-100">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={softIcon('rgba(59,130,246,0.12)', 'rgb(37,99,235)')}>
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-slate-900">{name || 'Class'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-slate-400">
                  {venue ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {venue}
                    </span>
                  ) : null}
                  {timeLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {timeLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl bg-[#F9FAFB] px-4 py-4 ring-1 ring-slate-100">
            <img src="/break.png" alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-slate-900">No classes today. Take a break!</div>
              <div className="mt-1 text-[12px] font-medium text-slate-400">Tap to open Schedule</div>
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function UtilityTile({ to, title, icon, iconStyle }) {
  const card = (
    <motion.div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-3 py-3 ring-1 ring-slate-100" whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl" style={iconStyle}>
          {icon}
        </span>
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </motion.div>
  );

  return <Link to={to}>{card}</Link>;
}

function MoreRow({ to, title, icon, iconStyle }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
      <Link to={to} className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-2xl" style={iconStyle}>
            {icon}
          </span>
          <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </Link>
    </motion.div>
  );
}

export default MyZone;
