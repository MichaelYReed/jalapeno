import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { requestNotificationPermission, scheduleDeliveryNotification } from '../../services/notificationService';

export default function CartDrawer({ open, onClose }) {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const order = await api.createOrder(orderItems);
      clearCart();
      onClose();
      toast.success('Order placed successfully!');

      // Request notification permission (will be silent if already granted/denied)
      await requestNotificationPermission();

      // Schedule mock delivery notification after 10 seconds
      scheduleDeliveryNotification(order.id);
    } catch (err) {
      console.error('Failed to create order:', err);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-xl z-50"
          >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 dark:text-gray-200" />
            <h2 className="font-semibold text-lg dark:text-gray-100">Your Cart</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5 dark:text-gray-200" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
              <p className="text-sm mt-2">Add items from the catalog or use the AI assistant</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                {/* Product Icon */}
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
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
                  <h3 className="font-medium text-sm line-clamp-1 dark:text-gray-100">{item.product.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ${item.product.price.toFixed(2)} / {item.product.unit}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                    >
                      <Minus className="w-4 h-4 dark:text-gray-200" />
                    </button>
                    <span className="w-8 text-center dark:text-gray-200">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                    >
                      <Plus className="w-4 h-4 dark:text-gray-200" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <span className="font-semibold dark:text-gray-100">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="text-2xl font-bold dark:text-gray-100">${getTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 text-sm"
            >
              Clear Cart
            </button>
          </div>
        )}
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
