import { forwardRef } from 'react';
import './Field.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    required = false,
    compact = false,
    size = 'md',
    className = '',
    selectClassName = '',
    id,
    children,
    ...rest
  },
  ref
) {
  return (
    <div className={joinClassNames('ui-field', compact && 'ui-field--compact', className)}>
      {label ? (
        <label htmlFor={id} className="ui-field__label">
          {label}
          {required ? <span className="ui-field__required"> *</span> : null}
        </label>
      ) : null}
      <select
        ref={ref}
        id={id}
        className={joinClassNames(
          'ui-field__control',
          `ui-field__control--${size}`,
          'ui-field__control--select',
          error && 'is-error',
          selectClassName
        )}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? <p className="ui-field__error">{error}</p> : null}
      {!error && hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  );
});

export default Select;
