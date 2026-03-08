import './CategorySidebar.css';

/**
 * 商品分类导航栏（FoodList 左侧）
 * @param {Array<{ id: string|number, name: string }>} categories - 按展示顺序
 * @param {string|number|null} activeId - 当前高亮分类 id
 * @param {Function} onSelect - (id) => void 点击回调
 */
function CategorySidebar({ categories = [], activeId, onSelect }) {
  return (
    <nav className="category-sidebar" aria-label="商品分类">
      <ul className="category-sidebar-list">
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              className={`category-sidebar-item ${activeId === cat.id ? 'active' : ''}`}
              onClick={() => onSelect(cat.id)}
              aria-current={activeId === cat.id ? 'true' : undefined}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default CategorySidebar;
