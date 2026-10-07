const RECENT_ORDER_IDS_KEY = 'jess_shop_recent_order_ids';
const LEGACY_LAST_ORDER_ID_KEY = 'jess_shop_last_order_id';
const MAX_REMEMBERED = 10;

/** Remembers every order a guest (no account, no login) has viewed on this device, most recent
 * first -- otherwise the order id in each confirmation email is the only way back in, and a guest
 * who's placed more than one order could only ever find their way back to whichever one they
 * looked at last. Saved whenever an order successfully loads (see orders/[id]/page.tsx), read by
 * Header.tsx to populate the "Orders" nav link/dropdown. */
export function getRecentOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_ORDER_IDS_KEY);
    if (raw) return JSON.parse(raw);
    // One-time migration from the old single-order-id key, so upgrading doesn't lose what a guest
    // could already find before this supported more than one.
    const legacy = localStorage.getItem(LEGACY_LAST_ORDER_ID_KEY);
    return legacy ? [legacy] : [];
  } catch {
    return [];
  }
}

/** Back-compat helper for anything that only ever cared about the single most recent order. */
export function getLastOrderId(): string | null {
  return getRecentOrderIds()[0] ?? null;
}

export function saveLastOrderId(orderId: string) {
  if (typeof window === 'undefined' || !orderId) return;
  const next = [orderId, ...getRecentOrderIds().filter((id) => id !== orderId)].slice(0, MAX_REMEMBERED);
  localStorage.setItem(RECENT_ORDER_IDS_KEY, JSON.stringify(next));
}
