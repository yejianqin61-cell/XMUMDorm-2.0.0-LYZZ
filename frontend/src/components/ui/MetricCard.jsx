import AppCard from './AppCard';

export default function MetricCard({ label, value, hint, className = '', ...rest }) {
  return (
    <AppCard className={className} {...rest}>
      <div className="ui-metric-card">
        <span className="ui-card__eyebrow">{label}</span>
        <strong className="ui-metric-card__value">{value}</strong>
        {hint ? <span className="ui-card__meta">{hint}</span> : null}
      </div>
    </AppCard>
  );
}
