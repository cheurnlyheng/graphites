'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse } from '@/lib/types';

/** Deliberately not login-gated: this is what the "track your order" link in the confirmation and
 * shipping emails points to, and most orders here are guest checkouts with no account to log into.
 * The backend already treats GET /api/orders/{id} as public for the same reason (unguessable UUID). */
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OrderResponse>(`/api/orders/${params.id}`)
      .then(setOrder)
      .catch(() => setNotFound(true));
  }, [params.id]);

  async function requestReturn() {
    const items = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([orderItemId]) => ({ orderItemId, quantity: 1, reason }));
    if (items.length === 0) {
      setStatus('Select at least one item.');
      return;
    }
    try {
      await apiFetch(`/api/orders/${params.id}/returns`, { method: 'POST', body: { items, reason } });
      setStatus('Return requested — we will email you once it is reviewed.');
    } catch {
      setStatus('Could not submit the return request.');
    }
  }

  if (notFound) return <p className="text-ink/50">We couldn&apos;t find that order.</p>;
  if (!order) return <p className="text-ink/50">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="page-heading">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-6 text-sm text-ink/50">{order.email}</p>

      <div className="card divide-y divide-line">
        {order.items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 p-4">
            <input
              type="checkbox"
              checked={!!selected[item.id]}
              onChange={(e) => setSelected((s) => ({ ...s, [item.id]: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
            />
            <div className="flex-1">
              <p className="font-medium text-ink">{item.productName}</p>
              {item.variantAttributes && <p className="text-sm text-ink/50">{item.variantAttributes}</p>}
            </div>
            <p className="text-ink">${item.lineTotal.toFixed(2)}</p>
          </label>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-ink/70">
        <p className="flex justify-between">
          <span>Subtotal</span> <span>${order.subtotal.toFixed(2)}</span>
        </p>
        <p className="flex justify-between">
          <span>Tax</span> <span>${order.taxAmount.toFixed(2)}</span>
        </p>
        <p className="flex justify-between">
          <span>Shipping</span> <span>${order.shippingAmount.toFixed(2)}</span>
        </p>
        <p className="flex justify-between border-t border-line pt-1.5 font-semibold text-ink">
          <span>Total</span> <span>${order.total.toFixed(2)}</span>
        </p>
      </div>

      {order.status === 'SHIPPED' && order.trackingNumber && (
        <div className="card mt-8 p-5">
          <p className="label">Shipping</p>
          <p className="mt-2 text-ink">
            {order.carrier ? `Shipped via ${order.carrier}` : 'Shipped'} — tracking number {order.trackingNumber}
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-3 inline-block">
              Track package
            </a>
          )}
        </div>
      )}

      {(order.status === 'PAID' || order.status === 'SHIPPED') && (
        <div className="card mt-8 p-5">
          <p className="label">Request a return</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. wrong size)"
            rows={2}
            className="input"
          />
          <button onClick={requestReturn} className="btn-secondary mt-3">
            Request return
          </button>
          {status && <p className="mt-3 text-sm text-ink/60">{status}</p>}
        </div>
      )}
    </div>
  );
}
