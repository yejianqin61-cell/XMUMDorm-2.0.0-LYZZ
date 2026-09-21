import NeoLabel from '../retroui/Label';

export default function Label({ className = '', children, htmlFor, ...props }) {
  return (
    <NeoLabel
      htmlFor={htmlFor}
      className={className}
      {...props}
    >
      {children}
    </NeoLabel>
  );
}