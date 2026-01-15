import { api } from './api';

// Status progression delays (ms from order creation)
const STATUS_DELAYS = {
  confirmed: 5000,   // 5s after order
  shipped: 15000,    // 15s after order
  delivered: 30000   // 30s after order
};

const STATUS_ORDER = ['pending', 'confirmed', 'shipped', 'delivered'];

// Get localStorage key for order timestamps
function getStorageKey(orderId) {
  return `order_timestamps_${orderId}`;
}

// Save timestamp for a status
function saveTimestamp(orderId, status) {
  const key = getStorageKey(orderId);
  const timestamps = JSON.parse(localStorage.getItem(key) || '{}');
  timestamps[status] = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(timestamps));
}

// Get all timestamps for an order
export function getStatusTimestamps(orderId) {
  const key = getStorageKey(orderId);
  return JSON.parse(localStorage.getItem(key) || '{}');
}

// Dispatch status change event
function dispatchStatusChange(orderId, status) {
  window.dispatchEvent(new CustomEvent('orderStatusChange', {
    detail: { orderId, status }
  }));
}

// Start the mock status progression for an order
export function startStatusProgression(orderId) {
  // Save initial pending timestamp
  saveTimestamp(orderId, 'pending');

  // Schedule each status transition
  Object.entries(STATUS_DELAYS).forEach(([status, delay]) => {
    window.setTimeout(async () => {
      try {
        await api.updateOrderStatus(orderId, status);
        saveTimestamp(orderId, status);
        dispatchStatusChange(orderId, status);
      } catch (err) {
        console.error(`Failed to update order ${orderId} to ${status}:`, err);
      }
    }, delay);
  });
}

// Get the index of a status (for progress calculation)
export function getStatusIndex(status) {
  return STATUS_ORDER.indexOf(status);
}

// Get all statuses
export function getStatuses() {
  return STATUS_ORDER;
}

// Check if a status is complete based on current status
export function isStatusComplete(currentStatus, checkStatus) {
  return getStatusIndex(currentStatus) >= getStatusIndex(checkStatus);
}

// Check if a status is the current active one
export function isStatusCurrent(currentStatus, checkStatus) {
  return currentStatus === checkStatus;
}
