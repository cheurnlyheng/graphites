const LAST_ORDER_ID_KEY = 'jess_shop_last_order_id';

/** Remembers the most recently viewed order so a guest (no account, no login) can still find their
 * way back to it after closing the tab, hitting back, or clearing navigation -- otherwise the order
 * id in the URL is the only way back in. Saved whenever an order successfully loads (see
 * orders/[id]/page.tsx), read by Header.tsx to show/hide the "Order" nav link. */
export function getLastOrderId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ORDER_ID_KEY);
}

export function saveLastOrderId(orderId: string) {
  if (typeof window === 'undefined' || !orderId) return;
  localStorage.setItem(LAST_ORDER_ID_KEY, orderId);
}
