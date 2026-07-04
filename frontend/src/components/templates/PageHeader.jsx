import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import './PageHeader.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function PageHeader({
  title,
  description,
  eyebrow,
  backTo,
  backLabel = 'Back',
  actions = null,
  meta = [],
  className = '',
}) {
  const hasMeta = Array.isArray(meta) && meta.length > 0;

  return (
    <div className={joinClassNames('page-header', className)}>
      {backTo ? (
        <Button as={Link} to={backTo} variant="tertiary" size="sm" className="page-header__back">
          {backLabel}
        </Button>
      ) : null}
      <div className="page-header__top">
        <div className="page-header__main">
          {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
          <h1 className="page-header__title">{title}</h1>
          {description ? <p className="page-header__description">{description}</p> : null}
          {hasMeta ? (
            <div className="page-header__meta">
              {meta.map((item, index) => (
                <span key={item?.key || index} className="page-header__meta-item">
                  {item?.label || item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
