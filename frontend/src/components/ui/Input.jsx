import NeoInput from '../retroui/Input';
import { forwardRef } from 'react';
import './Field.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    required = false,
    compact = false,
    size = 'md',
    prefix = null,
    suffix = null,
    className = '',
    inputClassName = '',
    id,
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
      <div className="ui-field__control-wrap">
        {prefix ? <span className="ui-field__prefix">{prefix}</span> : null}
        <NeoInput
          ref={ref}
          id={id}
          error={!!error}
          className={joinClassNames(
            prefix && 'pl-10',
            suffix && 'pr-10',
            sizeClass,
            inputClassName
          )}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        />
        {suffix ? <span className="ui-field__suffix">{suffix}</span> : null}
      </div>
      {error ? <p className="ui-field__error">{error}</p> : null}
      {!error && hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  );
});

export default Input;