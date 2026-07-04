import { forwardRef } from 'react';
import './Field.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

const Textarea = forwardRef(function Textarea(
  {
    label,
    hint,
    error,
    required = false,
    compact = false,
    className = '',
    textareaClassName = '',
    id,
    rows = 4,
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
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={joinClassNames(
          'ui-field__control',
          'ui-field__control--multiline',
          error && 'is-error',
          textareaClassName
        )}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {error ? <p className="ui-field__error">{error}</p> : null}
      {!error && hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  );
});

export default Textarea;
