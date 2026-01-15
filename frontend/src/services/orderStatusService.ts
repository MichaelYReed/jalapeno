import { api } from './api';
import type { OrderStatus } from '../types';

// Status progression delays (ms from order creation)
const STATUS_DELAYS: Record<string, number> = {
  confirmed: 5000,   // 5s after order
  shipped: 15000,    // 15s after order
  delivered: 30000   // 30s after order
};

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

type StatusTimestamps = Record<string, string>;

// Get localStorage key for order timestamps
function getStorageKey(orderId: number): string {
  return `order_timestamps_${orderId}`;
}

// Save timestamp for a status
function saveTimestamp(orderId: number, status: string): void {
  const key = getStorageKey(orderId);
  const timestamps: StatusTimestamps = JSON.parse(localStorage.getItem(key) || '{}');
  timestamps[status] = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(timestamps));
}

// Get all timestamps for an order
export function getStatusTimestamps(orderId: number): StatusTimestamps {
  const key = getStorageKey(orderId);
  return JSON.parse(localStorage.getItem(key) || '{}');
}

// Dispatch status change event
function dispatchStatusChange(orderId: number, status: string): void {
  window.dispatchEvent(new CustomEvent('orderStatusChange', {
    detail: { orderId, status }
  }));
}

// Start the mock status progression for an order
export function startStatusProgression(orderId: number): void {
  // Save initial pending timestamp
  saveTimestamp(orderId, 'pending');

  // Chain status transitions sequentially to avoid race conditions
  const statusSequence: Array<{ status: string; delay: number }> = [
    { status: 'confirmed', delay: STATUS_DELAYS.confirmed },
    { status: 'shipped', delay: STATUS_DELAYS.shipped },
    { status: 'delivered', delay: STATUS_DELAYS.delivered },
  ];

  async function processNextStatus(index: number): Promise<void> {
    if (index >= statusSequence.length) return;

    const { status, delay } = statusSequence[index];

    window.setTimeout(async () => {
      try {
        await api.updateOrderStatus(orderId, status as OrderStatus);
        saveTimestamp(orderId, status);
        dispatchStatusChange(orderId, status);
        // Process next status only after current one completes
        processNextStatus(index + 1);
      } catch (err) {
        console.error(`Failed to update order ${orderId} to ${status}:`, err);
        // Still try next status even if this one fails
        processNextStatus(index + 1);
      }
    }, index === 0 ? delay : (statusSequence[index].delay - statusSequence[index - 1].delay));
  }

  processNextStatus(0);
}

// Get the index of a status (for progress calculation)
export function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status as OrderStatus);
}

// Get all statuses
export function getStatuses(): OrderStatus[] {
  return STATUS_ORDER;
}

// Check if a status is complete based on current status
export function isStatusComplete(currentStatus: string, checkStatus: string): boolean {
  return getStatusIndex(currentStatus) >= getStatusIndex(checkStatus);
}

// Check if a status is the current active one
export function isStatusCurrent(currentStatus: string, checkStatus: string): boolean {
  return currentStatus === checkStatus;
}
