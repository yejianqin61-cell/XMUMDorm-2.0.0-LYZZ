import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Activity,
  Flag,
  MessageSquare,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getDashboard } from '../../api/admin';
import { useLanguage } from '../../context/LanguageContext';

const STAT_CARDS = [
  { key: 'totalUsers', icon: Users, label: '总用户', labelEn: 'Total Users', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  { key: 'newUsersToday', icon: UserPlus, label: '今日新增', labelEn: 'New Today', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  { key: 'activeUsersToday', icon: Activity, label: '今日活跃', labelEn: 'Active Today', color: '#9333ea', bg: 'rgba(147,51,234,0.08)' },
  { key: 'pendingReports', icon: Flag, label: '待处理举报', labelEn: 'Pending Reports', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
];

const CONTENT_KEYS = [
  { key: 'treeholePosts', label: '树洞', labelEn: 'Treehole' },
  { key: 'canteenReviews', label: '食堂点评', labelEn: 'Canteen' },
  { key: 'trendingPosts', label: '热搜', labelEn: 'Trending' },
  { key: 'courseReviews', label: '课程点评', labelEn: 'Course Reviews' },
  { key: 'clubActivities', label: '社团活动', labelEn: 'Club Activities' },
  { key: 'marketplaceItems', label: '二手市场', labelEn: 'Marketplace' },
  { key: 'errandPosts', label: '跑腿', labelEn: 'Errands' },
  { key: 'handbookArticles', label: '一站通', labelEn: 'Handbook' },
];

const REASON_LABELS = {
  spam: '垃圾广告', fraud: '诈骗信息', abuse: '辱骂攻击',
  nsfw: '色情内容', trolling: '恶意引战', privacy: '侵犯隐私',
  illegal_trade: '违规交易', other: '其他',
};

const TARGET_LABELS = {
  post: '树洞帖子', comment: '帖子评论', trending_post: '热搜帖子',
  campus_post: '校园此刻', product_comment: '食堂点评',
  club_activity: '社团活动', club_post: '社团帖子',
  marketplace: '二手商品', errand: '跑腿帖子',
  handbook_article: '一站通文章', handbook_comment: '一站通评论',
  course_review: '课程点评',
};

export default function AdminDashboard() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboard,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const stats = data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-slate-600 text-sm">{error?.message || (isZh ? '加载失败' : 'Failed to load')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '数据面板' : 'Dashboard'}
      </h1>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100"
          >
            <div
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl mb-2"
              style={{ backgroundColor: card.bg, color: card.color }}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div className="text-[24px] font-bold text-slate-900 tabular-nums">
              {stats[card.key] ?? 0}
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {isZh ? card.label : card.labelEn}
            </div>
          </div>
        ))}
      </div>

      {/* 子统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
        <MiniStat label={isZh ? '总用户' : 'Total Users'} value={stats.totalUsers} />
        <MiniStat label={isZh ? '学生' : 'Students'} value={stats.studentCount} />
        <MiniStat label={isZh ? '商家' : 'Merchants'} value={stats.merchantCount} />
        <MiniStat label={isZh ? '总帖子' : 'Total Posts'} value={stats.totalPosts} />
        <MiniStat label={isZh ? '总评论' : 'Total Comments'} value={stats.totalComments} />
        <MiniStat label={isZh ? '封禁用户' : 'Banned Users'} value={stats.bannedUsers} />
      </div>

      {/* 内容统计 */}
      <h2 className="text-[16px] font-semibold text-slate-900 mb-3">
        {isZh ? '内容统计' : 'Content Stats'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
        {CONTENT_KEYS.map((ck) => (
          <div key={ck.key} className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2.5">
            <span className="text-[13px] text-slate-600">{isZh ? ck.label : ck.labelEn}</span>
            <span className="text-[14px] font-semibold text-slate-900 tabular-nums">
              {stats.contentStats?.[ck.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* 最近举报 */}
      <h2 className="text-[16px] font-semibold text-slate-900 mb-3">
        {isZh ? '最近举报' : 'Recent Reports'}
      </h2>
      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        {stats.recentReports?.length > 0 ? (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="text-left px-4 py-2 font-medium">{isZh ? '时间' : 'Time'}</th>
                <th className="text-left px-4 py-2 font-medium">{isZh ? '模块' : 'Module'}</th>
                <th className="text-left px-4 py-2 font-medium">{isZh ? '原因' : 'Reason'}</th>
                <th className="text-left px-4 py-2 font-medium">{isZh ? '举报人' : 'Reporter'}</th>
                <th className="text-left px-4 py-2 font-medium">{isZh ? '状态' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentReports.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/myzone/admin/reports/${r.id}`)}
                >
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{isZh ? (TARGET_LABELS[r.target_type] || r.target_type) : r.target_type}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {isZh ? (REASON_LABELS[r.reason] || r.reason) : r.reason}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.reporter_name || '-'}</td>
                  <td className="px-4 py-2">
                    <ReportStatusBadge status={r.status} isZh={isZh} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-[13px] text-slate-400">
            {isZh ? '暂无举报' : 'No reports'}
          </p>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="flex flex-wrap gap-3 mt-5">
        <Link
          to="/myzone/admin/users"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <Users className="h-4 w-4" />
          {isZh ? '用户管理' : 'User Management'}
        </Link>
        <Link
          to="/myzone/admin/reports"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <Flag className="h-4 w-4" />
          {isZh ? '举报中心' : 'Reports'}
        </Link>
        <Link
          to="/myzone/admin/announcements"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <MessageSquare className="h-4 w-4" />
          {isZh ? '公告管理' : 'Announcements'}
        </Link>
        <Link
          to="/myzone/admin/logs"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileText className="h-4 w-4" />
          {isZh ? '操作日志' : 'Audit Logs'}
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-slate-100 px-3 py-2">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800 tabular-nums">{value ?? 0}</span>
    </div>
  );
}

function ReportStatusBadge({ status, isZh }) {
  const map = {
    pending: { label: isZh ? '待处理' : 'Pending', className: 'bg-amber-50 text-amber-700' },
    processing: { label: isZh ? '处理中' : 'Processing', className: 'bg-blue-50 text-blue-700' },
    resolved: { label: isZh ? '已处理' : 'Resolved', className: 'bg-green-50 text-green-700' },
    dismissed: { label: isZh ? '已驳回' : 'Dismissed', className: 'bg-slate-100 text-slate-500' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
