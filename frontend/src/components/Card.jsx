/**
 * 基础卡片容器：统一白底、圆角、阴影，供 AreaCard / MerchantCard / FoodCard 等复用
 * @param {React.ReactNode} children
 * @param {string} [className] 追加的类名
 * @param {React.ElementType} [as] 渲染标签，默认 'div'；若为 Link 需由调用方传入并带上 to
 */
function Card({ children, className = '', as: Component = 'div', ...rest }) {
  return (
    <Component className={`card ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
}

export default Card;
