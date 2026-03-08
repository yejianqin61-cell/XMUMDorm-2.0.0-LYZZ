import { forwardRef } from 'react';
import FoodCard from './FoodCard';
import EmptyState from './EmptyState';
import './CategorySection.css';

/**
 * 分类区块：一个分类标题 + 该分类下的 FoodCard 列表
 * @param {{ id: string|number, name: string }} category
 * @param {Array} foods - 该分类下的菜品列表
 */
const CategorySection = forwardRef(function CategorySection({ category, foods }, ref) {
  return (
    <section
      ref={ref}
      id={`category-${category.id}`}
      className="category-section"
      aria-labelledby={`category-title-${category.id}`}
    >
      <h2 id={`category-title-${category.id}`} className="category-section-title">
        {category.name}
      </h2>
      {foods.length === 0 ? (
        <EmptyState title="该分类下暂无商品" description="商家还没在此分类发布商品。" />
      ) : (
        <ul className="category-section-list" aria-label={`${category.name} 商品列表`}>
          {foods.map((food) => (
            <li key={food.id}>
              <FoodCard food={food} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

export default CategorySection;
