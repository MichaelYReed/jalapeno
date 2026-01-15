// Check if push notifications are supported and permitted
export function canShowPushNotification(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Request notification permission from the browser
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Vibrate the device (mobile only)
function vibrate(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]); // vibrate-pause-vibrate pattern
  }
}

// Schedule a delivery notification after a delay
// Dispatches a custom event that App.tsx listens for as fallback
export function scheduleDeliveryNotification(orderId: number, delayMs: number = 10000): void {
  window.setTimeout(() => {
    const title = 'Order Delivered!';
    const message = `Your order #${orderId} has been delivered.`;

    vibrate();

    // Try push notification first
    if (canShowPushNotification()) {
      try {
        new Notification(title, {
          body: message,
          icon: '/vite.svg',
          tag: `delivery-${orderId}`,
        });
        return;
      } catch (e) {
        console.warn('Push notification failed:', e);
      }
    }

    // Fallback: dispatch custom event for App to handle
    window.dispatchEvent(new CustomEvent('deliveryNotification', {
      detail: { title, message, orderId }
    }));
  }, delayMs);
}
