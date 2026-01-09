import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { useState } from 'react';

export default function CartDrawer({ open, onClose }) {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      await api.createOrder(orderItems);
      setOrderSuccess(true);
      clearCart();

      setTimeout(() => {
        setOrderSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Your Cart</h2>
            <span className="text-sm text-gray-500">
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {orderSuccess && (
          <div className="m-4 p-4 bg-green-100 text-green-700 rounded-lg text-center">
            Order placed successfully!
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
              <p className="text-sm mt-2">Add items from the catalog or use the AI assistant</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                {/* Product Icon */}
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-2xl">
                  {item.product.category === 'Proteins' && '🥩'}
                  {item.product.category === 'Produce' && '🥬'}
                  {item.product.category === 'Dairy' && '🧀'}
                  {item.product.category === 'Dry Goods' && '🌾'}
                  {item.product.category === 'Beverages' && '🥤'}
                  {item.product.category === 'Frozen' && '❄️'}
                  {item.product.category === 'Supplies' && '📦'}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-sm line-clamp-1">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">
                    ${item.product.price.toFixed(2)} / {item.product.unit}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <span className="font-semibold">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold">${getTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 py-2 text-sm"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
