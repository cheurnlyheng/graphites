const STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  FULFILLED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-200 text-gray-700',
  REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  RECEIVED: 'bg-indigo-100 text-indigo-800',
  DRAFT: 'bg-gray-200 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  ARCHIVED: 'bg-gray-200 text-gray-700'
};

/** Small color-coded pill for order/return/product/purchase-order statuses, used consistently
 * across the storefront account pages and the admin panel so status is scannable at a glance. */
export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STYLES[status] ?? 'bg-gray-200 text-gray-700'}`}>{status}</span>;
}
