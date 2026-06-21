function PublishQuickActionSheet({
  open,
  title,
  subtitle,
  options = [],
  onClose,
  onSelect,
}) {
  if (!open) return null;

  return (
    <div className="publish-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="publish-sheet__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="publish-sheet__panel">
        <div className="publish-sheet__handle" aria-hidden="true" />
        <div className="publish-sheet__header">
          <h3 className="publish-sheet__title">{title}</h3>
          {subtitle ? <p className="publish-sheet__subtitle">{subtitle}</p> : null}
        </div>
        <div className="publish-sheet__list">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className="publish-sheet__item"
              onClick={() => onSelect(option)}
            >
              <span className="publish-sheet__item-main">
                <span className="publish-sheet__item-title">{option.title}</span>
                {option.description ? (
                  <span className="publish-sheet__item-description">{option.description}</span>
                ) : null}
              </span>
              <span className="publish-sheet__item-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PublishQuickActionSheet;
