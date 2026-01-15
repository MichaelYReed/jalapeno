import { useState, MouseEvent, TouchEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import ProductDetailModal from './ProductDetailModal';
import type { Product } from '../../types';

// Detect touch device to disable hover animations
const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleAddToCart = (e?: MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    addItem(product, quantity);
    setQuantity(1);
  };

  // Direct touch handler for mobile - bypasses potential event issues
  const handleTouchEnd = (e: TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleAddToCart();
  };

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(product.id);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
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

  const isTouch = isTouchDevice();
  const favorited = isFavorite(product.id);

  return (
    <>
    <motion.div
      whileHover={isTouch ? undefined : { scale: 1.02 }}
      whileTap={isTouch ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-slate-800/50 border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md dark:hover:shadow-slate-800/70 transition-shadow cursor-pointer"
      onClick={() => setShowModal(true)}
    >
      {/* Product Image */}
      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">
            {product.category === 'Proteins' && '🥩'}
            {product.category === 'Produce' && '🥬'}
            {product.category === 'Dairy' && '🧀'}
            {product.category === 'Dry Goods' && '🌾'}
            {product.category === 'Beverages' && '🥤'}
            {product.category === 'Frozen' && '❄️'}
            {product.category === 'Supplies' && '📦'}
          </span>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors"
          title={favorited ? 'Remove from Order Guide' : 'Add to Order Guide'}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              favorited
                ? 'fill-pink-500 text-pink-500'
                : 'text-gray-400 hover:text-pink-500'
            }`}
          />
        </button>
      </div>

      <div className="p-4">
        {/* Category Badge */}
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getCategoryColor(product.category)}`}>
          {product.subcategory || product.category}
        </span>

        {/* Product Name */}
        <h3 className="font-semibold mt-2 text-gray-900 dark:text-gray-100 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {product.description}
        </p>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / {product.unit}
          </span>
        </div>

        {/* Quantity Selector & Add to Cart */}
        <div
          className="mt-4 flex items-center gap-2 relative z-10"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-lg">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-l-lg touch-manipulation"
            >
              <Minus className="w-4 h-4 dark:text-gray-200" />
            </button>
            <input
              type="number"
              value={quantity}
              onClick={(e) => e.stopPropagation()}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center border-x border-gray-300 dark:border-slate-600 py-1 focus:outline-none bg-white dark:bg-slate-800 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-r-lg touch-manipulation"
            >
              <Plus className="w-4 h-4 dark:text-gray-200" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            onTouchEnd={isTouch ? handleTouchEnd : undefined}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors touch-manipulation"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </motion.div>

    <ProductDetailModal
      product={product}
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    />
    </>
  );
}
