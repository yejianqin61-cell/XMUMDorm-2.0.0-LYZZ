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
        <input
          ref={ref}
          id={id}
          className={joinClassNames(
            'ui-field__control',
            `ui-field__control--${size}`,
            prefix && 'ui-field__control--with-prefix',
            suffix && 'ui-field__control--with-suffix',
            error && 'is-error',
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
