import './SectionHeader.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SectionHeader({
  title,
  description,
  action = null,
  aside = null,
  compact = false,
  className = '',
}) {
  const rightContent = aside || action;

  return (
    <div className={joinClassNames('section-header', compact && 'section-header--compact', className)}>
      <div className="section-header__main">
        <h2 className="section-header__title">{title}</h2>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
      {rightContent ? <div className="section-header__aside">{rightContent}</div> : null}
    </div>
  );
}
