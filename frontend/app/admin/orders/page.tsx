'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse, PageResponse } from '@/lib/types';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    const q = status ? `?status=${status}&size=100` : '?size=100';
    apiFetch<PageResponse<OrderResponse>>(`/api/admin/orders${q}`, { token: auth.token })
      .then((p) => setOrders(p.content))
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-heading">Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid (needs fulfillment)</option>
          <option value="SHIPPED">Shipped</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <div className="card divide-y divide-line">
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between p-4 transition-colors hover:bg-paper">
            <div>
              <p className="font-medium text-ink">
                #{o.id.slice(0, 8)} — {o.email}
                {o.shippingAddressValid === false && (
                  <span title={o.shippingAddressValidationNote ?? 'Address may not be deliverable'} className="ml-2 text-amber-600">
                    ⚠ address needs review
                  </span>
                )}
              </p>
              <p className="text-sm text-ink/50">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-ink">${o.total.toFixed(2)}</p>
              <StatusBadge status={o.status} />
            </div>
          </Link>
        ))}
        {orders.length === 0 && <p className="p-6 text-center text-ink/50">No orders.</p>}
      </div>
    </div>
  );
}
