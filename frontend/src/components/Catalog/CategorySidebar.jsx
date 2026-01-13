import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

export default function CategorySidebar({ selectedCategory, onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
      // Expand all categories by default
      const expandedState = {};
      data.forEach(cat => {
        expandedState[cat.name] = true;
      });
      setExpanded(expandedState);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryName) => {
    setExpanded(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const isSelected = (category, subcategory = null) => {
    if (!selectedCategory) return false;
    if (subcategory) {
      return selectedCategory.name === category && selectedCategory.subcategory === subcategory;
    }
    return selectedCategory.name === category && !selectedCategory.subcategory;
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded" />
      ))}
    </div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-slate-800/50 border border-gray-200 dark:border-slate-700 p-4">
      <h2 className="font-semibold text-lg mb-4 dark:text-gray-100">Categories</h2>

      {/* All Products */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
          !selectedCategory ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
        }`}
      >
        All Products
      </button>

      {/* Category List */}
      <div className="space-y-1">
        {categories.map(category => (
          <div key={category.name}>
            <div className="flex items-center">
              <button
                onClick={() => toggleExpanded(category.name)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
              >
                {expanded[category.name] ? (
                  <ChevronDown className="w-4 h-4 dark:text-gray-200" />
                ) : (
                  <ChevronRight className="w-4 h-4 dark:text-gray-200" />
                )}
              </button>
              <button
                onClick={() => onSelectCategory({ name: category.name })}
                className={`flex-1 text-left px-2 py-2 rounded-lg transition-colors ${
                  isSelected(category.name) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                }`}
              >
                {category.name}
              </button>
            </div>

            {/* Subcategories */}
            {expanded[category.name] && category.subcategories.length > 0 && (
              <div className="ml-6 space-y-1 mt-1">
                {category.subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => onSelectCategory({ name: category.name, subcategory: sub })}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isSelected(category.name, sub)
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
