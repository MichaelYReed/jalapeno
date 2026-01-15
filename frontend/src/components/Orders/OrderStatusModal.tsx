import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import Modal from '../UI/Modal';
import OrderTimeline from './OrderTimeline';
import type { Order, OrderStatus } from '../../types';

interface OrderStatusChangeEvent extends CustomEvent {
  detail: {
    orderId: number;
    status: OrderStatus;
  };
}

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function OrderStatusModal({ isOpen, onClose, order }: OrderStatusModalProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('pending');

  // Listen for status changes
  useEffect(() => {
    if (!order?.id) return;

    const handleStatusChange = (e: Event) => {
      const event = e as OrderStatusChangeEvent;
      if (event.detail.orderId === order.id) {
        setCurrentStatus(event.detail.status);
      }
    };

    window.addEventListener('orderStatusChange', handleStatusChange);
    return () => window.removeEventListener('orderStatusChange', handleStatusChange);
  }, [order?.id]);

  // Reset status when modal opens with new order
  useEffect(() => {
    if (isOpen && order) {
      setCurrentStatus(order.status || 'pending');
    }
  }, [isOpen, order]);

  const handleViewOrders = () => {
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'orders' }));
    onClose();
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Placed!" size="sm">
      <div className="p-6">
        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Your order has been placed successfully!
          </p>
        </div>

        {/* Order Timeline */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
          <OrderTimeline orderId={order.id} currentStatus={currentStatus} />
        </div>

        {/* Order Summary */}
        <div className="border-t dark:border-slate-700 pt-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold dark:text-gray-100">Order #{order.id}</span>
            <span className="font-bold text-lg dark:text-gray-100">${order.total?.toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewOrders}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            View All Orders
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </Modal>
  );
}
