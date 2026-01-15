import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import type { Product } from '../../types';

export default function OrderGuide() {
  const { favorites, removeFavorite, clearFavorites } = useFavorites();
  const { addItem } = useCart();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadProducts = async () => {
      if (favorites.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const allProducts = await api.getProducts();
        const favoriteProducts = allProducts.filter((p: Product) =>
          favorites.includes(p.id)
        );
        setProducts(favoriteProducts);

        // Initialize quantities to 1 for each product
        const initialQuantities: Record<number, number> = {};
        favoriteProducts.forEach((p: Product) => {
          initialQuantities[p.id] = 1;
        });
        setQuantities(initialQuantities);
      } catch (err) {
        console.error('Failed to load products:', err);
        toast.error('Failed to load order guide');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [favorites, toast]);

  const updateQuantity = (productId: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || 1;
    addItem(product, qty);
    toast.success(`Added ${qty} ${product.name} to cart`);
  };

  const handleAddAllToCart = () => {
    let count = 0;
    products.forEach(product => {
      const qty = quantities[product.id] || 1;
      addItem(product, qty);
      count += qty;
    });
    toast.success(`Added ${count} items to cart`);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Proteins': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      'Produce': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      'Dairy': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      'Dry Goods': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      'Beverages': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      'Frozen': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
      'Supplies': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[category] || colors['Supplies'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          No items in your Order Guide
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Click the heart icon on products to add them to your quick-order guide
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-gray-100">Order Guide</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {products.length} saved item{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={clearFavorites}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleAddAllToCart}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Add All to Cart
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-slate-800/50 border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-4"
          >
            {/* Product Image */}
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {product.category === 'Proteins' && '🥩'}
                  {product.category === 'Produce' && '🥬'}
                  {product.category === 'Dairy' && '🧀'}
                  {product.category === 'Dry Goods' && '🌾'}
                  {product.category === 'Beverages' && '🥤'}
                  {product.category === 'Frozen' && '❄️'}
                  {product.category === 'Supplies' && '📦'}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(product.category)}`}>
                  {product.category}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ${product.price.toFixed(2)} / {product.unit}
                </span>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(product.id, -1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4 dark:text-gray-300" />
              </button>
              <span className="w-8 text-center font-medium dark:text-gray-200">
                {quantities[product.id] || 1}
              </span>
              <button
                onClick={() => updateQuantity(product.id, 1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 dark:text-gray-300" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddToCart(product)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => removeFavorite(product.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove from Order Guide"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
