/**
 * 交友模块（任务管理表 #9）：页面接线、通知分类、迁移只新增表
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

describe('交友页面接线', () => {
  const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
  const nav = read('frontend', 'src', 'components', 'shell', 'siteShellNav.js');
  const mailbox = read('frontend', 'src', 'pages', 'Mailbox.jsx');
  const migration = read('migrations', '082_date_profiles.sql');

  it('/about/date 已注册且懒加载；导航有「交友」', () => {
    expect(routes).toContain("const DatePage = lazy(() => import('../pages/DatePage'));");
    expect(routes).toContain('path="about/date" element={renderLazyRoute(DatePage)}');
    expect(nav).toContain("key: 'date'");
    expect(nav).toContain("to: '/about/date'");
  });

  it('互相打招呼的通知归入「互动」，信箱有专门文案', () => {
    const { getNotificationCategory, getNotificationModule } = require('../../services/notificationService');
    expect(getNotificationCategory('date_match')).toBe('interaction');
    expect(getNotificationModule('date_match')).toBe('date');
    expect(mailbox).toContain("g.latest?.type === 'date_match'");
  });

  it('迁移只新建三张表，不改已有表', () => {
    const sql = migration.replace(/--.*$/gm, '');
    expect(sql.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(3);
    expect(sql).not.toMatch(/\bALTER TABLE\b|\bDROP TABLE\b/);
  });
});
