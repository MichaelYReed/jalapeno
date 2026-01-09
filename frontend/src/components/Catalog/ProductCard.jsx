import { useState } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(product, quantity);
    setQuantity(1);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Proteins': 'bg-red-100 text-red-700',
      'Produce': 'bg-green-100 text-green-700',
      'Dairy': 'bg-yellow-100 text-yellow-700',
      'Dry Goods': 'bg-amber-100 text-amber-700',
      'Beverages': 'bg-blue-100 text-blue-700',
      'Frozen': 'bg-cyan-100 text-cyan-700',
      'Supplies': 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image Placeholder */}
      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <span className="text-4xl">
          {product.category === 'Proteins' && '🥩'}
          {product.category === 'Produce' && '🥬'}
          {product.category === 'Dairy' && '🧀'}
          {product.category === 'Dry Goods' && '🌾'}
          {product.category === 'Beverages' && '🥤'}
          {product.category === 'Frozen' && '❄️'}
          {product.category === 'Supplies' && '📦'}
        </span>
      </div>

      <div className="p-4">
        {/* Category Badge */}
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getCategoryColor(product.category)}`}>
          {product.subcategory || product.category}
        </span>

        {/* Product Name */}
        <h3 className="font-semibold mt-2 text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </p>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-bold text-primary-600">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">
            / {product.unit}
          </span>
        </div>

        {/* Quantity Selector & Add to Cart */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 hover:bg-gray-100 rounded-l-lg"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center border-x border-gray-300 py-1 focus:outline-none"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
