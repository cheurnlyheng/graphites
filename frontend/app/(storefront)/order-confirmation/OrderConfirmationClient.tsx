'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse } from '@/lib/types';

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    apiFetch<OrderResponse>(`/api/orders/by-session/${sessionId}`)
      .then(setOrder)
      .catch(() =>
        setError(
          "We couldn't find that order yet — if you just paid, give it a few seconds and refresh (Stripe's confirmation can arrive a moment after checkout)."
        )
      );
  }, [sessionId]);

  if (!sessionId) return <p className="text-ink/50">Missing checkout session.</p>;
  if (error) return <p className="text-ink/60">{error}</p>;
  if (!order) return <p className="text-ink/50">Loading your order…</p>;

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Order confirmed</p>
      <h1 className="page-heading">Thank you!</h1>
      <p className="mt-2 text-ink/60">
        A confirmation with your order status link was sent to <span className="font-medium text-ink">{order.email}</span>.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <StatusBadge status={order.status} />
        <Link href={`/orders/${order.id}`} className="text-sm font-medium text-accent hover:underline">
          Track this order
        </Link>
      </div>

      <div className="card mt-6 divide-y divide-line">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between p-4">
            <div>
              <p className="font-medium text-ink">{item.productName}</p>
              {item.variantAttributes && <p className="text-sm text-ink/50">{item.variantAttributes}</p>}
            </div>
            <p className="text-ink">${item.lineTotal.toFixed(2)}</p>
          </div>
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
    </div>
  );
}
