import MetricCard from '../ui/MetricCard';

const SUMMARY_ITEMS = [
  { key: 'events_today', label: '今日活动', hint: '可参与的活动数量' },
  { key: 'unread_notifications', label: '未读通知', hint: '互动与事务提醒' },
  { key: 'campus_notice_count', label: '校园通知', hint: '学校与学院最新动态' },
];

export default function TodayCampusSummary({ summary }) {
  return (
    <section className="today-campus-summary" aria-label="今日校园数据摘要">
      {SUMMARY_ITEMS.map((item) => (
        <MetricCard
          key={item.key}
          className="today-campus-summary-card"
          label={item.label}
          value={Number(summary?.quick_stats?.[item.key]) || 0}
          hint={item.hint}
        />
      ))}
    </section>
  );
}
