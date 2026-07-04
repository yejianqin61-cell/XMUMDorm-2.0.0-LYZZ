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
import { getDashboard } from '@shared/api/admin';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/templates/PageHeader';
import SectionHeader from '../../components/templates/SectionHeader';
import AdminPageLayout from '../../components/templates/AdminPageLayout';
import './AdminDashboard.css';

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
  spam: '垃圾广告',
  fraud: '诈骗信息',
  abuse: '辱骂攻击',
  nsfw: '色情内容',
  trolling: '恶意引战',
  privacy: '侵犯隐私',
  illegal_trade: '违规交易',
  other: '其他',
};

const TARGET_LABELS = {
  post: '树洞帖子',
  comment: '帖子评论',
  trending_post: '热搜帖子',
  campus_post: '校园此刻',
  product_comment: '食堂点评',
  club_activity: '社团活动',
  club_post: '社团帖子',
  marketplace: '二手商品',
  errand: '跑腿帖子',
  handbook_article: '一站通文章',
  handbook_comment: '一站通评论',
  course_review: '课程点评',
};

const QUICK_LINKS = [
  { to: '/myzone/admin/users', icon: Users, label: '用户管理', labelEn: 'User Management' },
  { to: '/myzone/admin/reports', icon: Flag, label: '举报中心', labelEn: 'Reports' },
  { to: '/myzone/admin/announcements', icon: MessageSquare, label: '公告管理', labelEn: 'Announcements' },
  { to: '/myzone/admin/logs', icon: FileText, label: '操作日志', labelEn: 'Audit Logs' },
];

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

  const headerMeta = useMemo(
    () => [
      { key: 'reports', label: isZh ? `${stats.pendingReports ?? 0} 个待处理举报` : `${stats.pendingReports ?? 0} pending reports` },
      { key: 'active', label: isZh ? `${stats.activeUsersToday ?? 0} 今日活跃` : `${stats.activeUsersToday ?? 0} active today` },
      { key: 'mode', label: isZh ? '后台模板扩散验证' : 'Admin layout validation' },
    ],
    [isZh, stats.activeUsersToday, stats.pendingReports]
  );

  if (isLoading) {
    return (
      <div className="admin-dashboard-page admin-dashboard-page--state">
        <Loader2 className="admin-dashboard-page__spinner" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="admin-dashboard-page admin-dashboard-page--state">
        <AlertTriangle className="admin-dashboard-page__warning" />
        <p className="admin-dashboard-page__error-text">{error?.message || (isZh ? '加载失败' : 'Failed to load')}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <AdminPageLayout
        mode="dense"
        className="admin-dashboard-layout"
        asideSticky
        header={(
          <PageHeader
            eyebrow={isZh ? '后台总览' : 'Admin Overview'}
            title={isZh ? '数据面板' : 'Dashboard'}
            description={
              isZh
                ? '把后台首页的统计、内容状态、举报与快捷入口收口到统一后台模板里，验证它不只服务于广场后台。'
                : 'Bring dashboard stats, content health, reports, and shortcuts into the shared admin template to prove it scales beyond square admin.'
            }
            backTo="/myzone"
            backLabel={isZh ? '返回我的页面' : 'Back'}
            meta={headerMeta}
            actions={(
              <div className="admin-dashboard-header-actions">
                <Button as={Link} to="/myzone/admin/reports" variant="secondary" size="sm">
                  {isZh ? '处理举报' : 'Review reports'}
                </Button>
                <Button as={Link} to="/myzone/admin/users" size="sm">
                  {isZh ? '进入用户管理' : 'Open users'}
                </Button>
              </div>
            )}
          />
        )}
        toolbar={(
          <div className="admin-dashboard-toolbar">
            <div className="admin-dashboard-toolbar__chips">
              <span className="admin-dashboard-toolbar__chip">{isZh ? `总用户 ${stats.totalUsers ?? 0}` : `Users ${stats.totalUsers ?? 0}`}</span>
              <span className="admin-dashboard-toolbar__chip">{isZh ? `总评论 ${stats.totalComments ?? 0}` : `Comments ${stats.totalComments ?? 0}`}</span>
              <span className="admin-dashboard-toolbar__chip">{isZh ? `封禁用户 ${stats.bannedUsers ?? 0}` : `Banned ${stats.bannedUsers ?? 0}`}</span>
            </div>
            <div className="admin-dashboard-toolbar__actions">
              <Button as={Link} to="/myzone/admin/logs" variant="secondary" size="sm">
                {isZh ? '查看日志' : 'View logs'}
              </Button>
            </div>
          </div>
        )}
        content={(
          <div className="admin-dashboard-content">
            <section className="admin-dashboard-section">
              <SectionHeader
                title={isZh ? '核心统计' : 'Core Stats'}
                description={
                  isZh
                    ? '后台首页的第一层应该优先回答当前平台是否健康、哪里需要先处理。'
                    : 'The first layer should answer whether the platform is healthy and what needs attention first.'
                }
              />
              <div className="admin-dashboard-stat-grid">
                {STAT_CARDS.map((card) => (
                  <Card key={card.key} className="admin-dashboard-stat-card" padding="lg">
                    <div
                      className="admin-dashboard-stat-card__icon"
                      style={{ backgroundColor: card.bg, color: card.color }}
                    >
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div className="admin-dashboard-stat-card__value">{stats[card.key] ?? 0}</div>
                    <div className="admin-dashboard-stat-card__label">{isZh ? card.label : card.labelEn}</div>
                  </Card>
                ))}
              </div>
            </section>

            <section className="admin-dashboard-section">
              <SectionHeader
                title={isZh ? '平台基础指标' : 'Platform Baselines'}
                description={
                  isZh
                    ? '把高频基础数字拆成紧凑卡片，保持后台信息密度，但不让阅读节奏失控。'
                    : 'Compact baseline cards keep density high without letting the dashboard turn chaotic.'
                }
              />
              <div className="admin-dashboard-mini-grid">
                <MiniStat label={isZh ? '总用户' : 'Total Users'} value={stats.totalUsers} />
                <MiniStat label={isZh ? '学生' : 'Students'} value={stats.studentCount} />
                <MiniStat label={isZh ? '商家' : 'Merchants'} value={stats.merchantCount} />
                <MiniStat label={isZh ? '总帖子' : 'Total Posts'} value={stats.totalPosts} />
                <MiniStat label={isZh ? '总评论' : 'Total Comments'} value={stats.totalComments} />
                <MiniStat label={isZh ? '封禁用户' : 'Banned Users'} value={stats.bannedUsers} />
              </div>
            </section>

            <section className="admin-dashboard-section">
              <SectionHeader
                title={isZh ? '内容统计' : 'Content Stats'}
                description={
                  isZh
                    ? '把各业务模块的数据集中到一块，方便后台快速判断内容分布。'
                    : 'Collect module-level volume so admins can quickly judge where content is accumulating.'
                }
              />
              <div className="admin-dashboard-content-grid">
                {CONTENT_KEYS.map((item) => (
                  <div key={item.key} className="admin-dashboard-content-item">
                    <span className="admin-dashboard-content-item__label">{isZh ? item.label : item.labelEn}</span>
                    <span className="admin-dashboard-content-item__value">{stats.contentStats?.[item.key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-dashboard-section">
              <SectionHeader
                title={isZh ? '最近举报' : 'Recent Reports'}
                description={
                  isZh
                    ? '保留最近举报表格，只把它放进更稳定的后台内容区，不改变跳转和状态徽标逻辑。'
                    : 'Keep the report table intact while moving it into a steadier admin content zone.'
                }
              />
              <Card className="admin-dashboard-report-card" padding="lg">
                {stats.recentReports?.length > 0 ? (
                  <div className="admin-dashboard-report-table-wrap">
                    <table className="admin-dashboard-report-table">
                      <thead>
                        <tr>
                          <th>{isZh ? '时间' : 'Time'}</th>
                          <th>{isZh ? '模块' : 'Module'}</th>
                          <th>{isZh ? '原因' : 'Reason'}</th>
                          <th>{isZh ? '举报人' : 'Reporter'}</th>
                          <th>{isZh ? '状态' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentReports.map((report) => (
                          <tr
                            key={report.id}
                            className="admin-dashboard-report-row"
                            onClick={() => navigate(`/myzone/admin/reports/${report.id}`)}
                          >
                            <td>{report.created_at ? new Date(report.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                            <td>{isZh ? (TARGET_LABELS[report.target_type] || report.target_type) : report.target_type}</td>
                            <td>{isZh ? (REASON_LABELS[report.reason] || report.reason) : report.reason}</td>
                            <td>{report.reporter_name || '-'}</td>
                            <td><ReportStatusBadge status={report.status} isZh={isZh} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-dashboard-empty">{isZh ? '暂无举报' : 'No reports'}</p>
                )}
              </Card>
            </section>
          </div>
        )}
        aside={(
          <div className="admin-dashboard-aside">
            <Card className="admin-dashboard-aside-card" padding="lg">
              <SectionHeader
                title={isZh ? '快速入口' : 'Quick Access'}
                description={
                  isZh
                    ? '右侧辅助栏承担高频后台跳转，而不是把所有入口继续塞回主内容区。'
                    : 'The right rail carries common admin jumps instead of pushing every action back into the main content.'
                }
                compact
              />
              <div className="admin-dashboard-quick-links">
                {QUICK_LINKS.map((item) => (
                  <Link key={item.to} to={item.to} className="admin-dashboard-quick-link">
                    <item.icon className="h-4 w-4" />
                    <span>{isZh ? item.label : item.labelEn}</span>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="admin-dashboard-aside-card" padding="lg">
              <SectionHeader
                title={isZh ? '后台摘要' : 'Admin Summary'}
                description={
                  isZh
                    ? '这里保留最值得后台先扫一眼的摘要信息，用来验证模板侧栏的价值。'
                    : 'Keep the highest-signal summary here to validate the value of the admin template side rail.'
                }
                compact
              />
              <div className="admin-dashboard-summary-list">
                <div className="admin-dashboard-summary-item">
                  <span>{isZh ? '待处理举报' : 'Pending reports'}</span>
                  <strong>{stats.pendingReports ?? 0}</strong>
                </div>
                <div className="admin-dashboard-summary-item">
                  <span>{isZh ? '今日活跃用户' : 'Active users today'}</span>
                  <strong>{stats.activeUsersToday ?? 0}</strong>
                </div>
                <div className="admin-dashboard-summary-item">
                  <span>{isZh ? '今日新增用户' : 'New users today'}</span>
                  <strong>{stats.newUsersToday ?? 0}</strong>
                </div>
              </div>
            </Card>
          </div>
        )}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="admin-dashboard-mini-stat">
      <span className="admin-dashboard-mini-stat__label">{label}</span>
      <span className="admin-dashboard-mini-stat__value">{value ?? 0}</span>
    </div>
  );
}

function ReportStatusBadge({ status, isZh }) {
  const map = {
    pending: { label: isZh ? '待处理' : 'Pending', tone: 'pending' },
    processing: { label: isZh ? '处理中' : 'Processing', tone: 'processing' },
    resolved: { label: isZh ? '已处理' : 'Resolved', tone: 'resolved' },
    dismissed: { label: isZh ? '已驳回' : 'Dismissed', tone: 'dismissed' },
  };
  const item = map[status] || map.pending;
  return <Badge tone={item.tone} size="xs">{item.label}</Badge>;
}
