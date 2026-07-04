import Input from '../ui/Input';

/**
 * 认证页输入框，兼容原有 props，同时改为消费统一的 Input 基础件。
 * @param {boolean} [compact] 更小标签与输入高度（注册页一屏）
 */
export default function InputField({
  compact = false,
  inputClassName = '',
  className = '',
  ...rest
}) {
  return (
    <Input
      compact={compact}
      size={compact ? 'sm' : 'md'}
      className={className}
      inputClassName={inputClassName}
      {...rest}
    />
  );
}
