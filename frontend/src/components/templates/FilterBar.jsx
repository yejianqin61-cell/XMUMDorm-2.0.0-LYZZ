import './FilterBar.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function FilterBar({
  search = null,
  filters = null,
  sort = null,
  viewSwitcher = null,
  actions = null,
  sticky = false,
  className = '',
}) {
  const hasUtility = sort || viewSwitcher || actions;
  const hasTopRow = search || hasUtility;

  return (
    <div className={joinClassNames('filter-bar', sticky && 'filter-bar--sticky', className)}>
      {hasTopRow ? (
        <div className="filter-bar__top">
          {search ? <div className="filter-bar__search">{search}</div> : null}
          {hasUtility ? (
            <div className="filter-bar__utility">
              {sort ? <div className="filter-bar__utility-group">{sort}</div> : null}
              {viewSwitcher ? <div className="filter-bar__utility-group">{viewSwitcher}</div> : null}
              {actions ? <div className="filter-bar__utility-group filter-bar__utility-group--actions">{actions}</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {filters ? <div className="filter-bar__filters">{filters}</div> : null}
    </div>
  );
}
