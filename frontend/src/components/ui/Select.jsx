import NeoSelect from '../retroui/Select';
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
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'min-h-[48px]';

  return (
    <div className={joinClassNames('ui-field', compact && 'ui-field--compact', className)}>
      {label ? (
        <label htmlFor={id} className="ui-field__label">
          {label}
          {required ? <span className="ui-field__required"> *</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <NeoSelect
          ref={ref}
          id={id}
          error={!!error}
          className={joinClassNames('pr-10', sizeClass, selectClassName)}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        >
          {children}
        </NeoSelect>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {error ? <p className="ui-field__error">{error}</p> : null}
      {!error && hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  );
});

export default Select;