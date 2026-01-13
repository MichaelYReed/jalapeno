import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import Modal from '../UI/Modal';
import NutritionFacts from './NutritionFacts';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [nutrition, setNutrition] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNutrition(null);
      setLoadingNutrition(true);

      api.getNutrition(product.id)
        .then(setNutrition)
        .catch((err) => {
          console.error('Failed to fetch nutrition:', err);
          setNutrition({ error: 'Failed to load nutrition data' });
        })
        .finally(() => setLoadingNutrition(false));
    }
  }, [isOpen, product]);

  const handleAddToCart = () => {
    addItem(product, quantity);
    onClose();
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Proteins': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      'Produce': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      'Dairy': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      'Dry Goods': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      'Beverages': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      'Frozen': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
      'Supplies': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.name} size="lg">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Image and Details */}
          <div>
            {/* Product Image */}
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-lg overflow-hidden mb-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
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

            {/* Category Badge */}
            <div className="flex gap-2 mb-3">
              <span className={`inline-block px-3 py-1 text-sm rounded-full ${getCategoryColor(product.category)}`}>
                {product.category}
              </span>
              {product.subcategory && (
                <span className="inline-block px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                  {product.subcategory}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{product.description}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-lg text-gray-500 dark:text-gray-400">
                / {product.unit}
              </span>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-l-lg"
                >
                  <Minus className="w-5 h-5 dark:text-gray-200" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-x border-gray-300 dark:border-slate-600 py-2 focus:outline-none text-lg bg-white dark:bg-slate-800 dark:text-gray-100"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-r-lg"
                >
                  <Plus className="w-5 h-5 dark:text-gray-200" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
            </div>

            {/* Subtotal */}
            <div className="mt-4 text-right text-gray-600 dark:text-gray-400">
              Subtotal: <span className="font-bold text-gray-900 dark:text-gray-100">${(product.price * quantity).toFixed(2)}</span>
            </div>
          </div>

          {/* Right: Nutrition Facts */}
          <div>
            <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Nutritional Information</h3>
            <NutritionFacts nutrition={nutrition} loading={loadingNutrition} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
