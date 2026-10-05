'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse, PageResponse } from '@/lib/types';

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'Needs Fulfillment (Paid)', value: 'PAID' },
  { label: 'Pending Payment', value: 'PENDING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' }
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    const q = status ? `?status=${status}&size=100` : '?size=100';
    apiFetch<PageResponse<OrderResponse>>(`/api/admin/orders${q}`, { token: auth.token })
      .then((p) => setOrders(p.content))
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      })
      .finally(() => setLoading(false));
  }, [status, router]);

  return (
    <div className="w-full max-w-[1700px] space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Fulfillment Queue
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              Orders
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#10100F]/5 text-[#10100F]/70 border border-[#10100F]/10">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Filter Pills Rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              status === f.value
                ? 'bg-[#10100F] text-white shadow-2xs'
                : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:border-[#10100F] hover:text-[#10100F]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table with sticky header */}
      <div className="rounded-xl border border-[#e5ded2] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-xs font-bold uppercase tracking-wider text-[#10100F]/60 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-5">Order Reference</th>
                <th className="py-3.5 px-5">Customer Email</th>
                <th className="py-3.5 px-5">Order Date</th>
                <th className="py-3.5 px-5">Total Paid</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded2]/80">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-5"><div className="h-4 w-20 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-4 w-36 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-5 w-20 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-4 w-16 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5 text-right"><div className="h-7 w-20 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-[#10100F]/60">
                    <p className="font-semibold text-[#10100F]">No orders found for this filter.</p>
                    <p className="text-xs text-[#10100F]/50 mt-1">Orders placed by customers will appear in this queue.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#f3f3f1]/50 transition-colors group">
                    <td className="py-3.5 px-5 font-bold text-xs sm:text-sm text-[#10100F]">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline flex items-center gap-1.5">
                        <span>#{o.id.slice(0, 8)}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-xs sm:text-sm text-[#10100F] truncate max-w-sm">{o.email}</p>
                      {o.shippingAddressValid === false && (
                        <span
                          title={o.shippingAddressValidationNote ?? 'Address validation issue'}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 mt-1"
                        >
                          ⚠ Address Check Needed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#10100F]/60">
                      {new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-xs sm:text-sm text-[#10100F]">
                      ${o.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#10100F] border border-[#e5ded2] bg-white px-3.5 py-1.5 hover:bg-[#10100F] hover:text-white transition-all shadow-2xs active:scale-95"
                      >
                        <span>Fulfill</span>
                        <span className="text-[10px]">→</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
