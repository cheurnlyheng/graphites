'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse, ShippingRateOption, ShipmentResponse } from '@/lib/types';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [rates, setRates] = useState<ShippingRateOption[]>([]);
  const [shipments, setShipments] = useState<ShipmentResponse[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<OrderResponse>(`/api/admin/orders/${params.id}`, { token: auth.token })
      .then(setOrder)
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      });
    apiFetch<ShipmentResponse[]>(`/api/admin/orders/${params.id}/shipping`, { token: auth.token })
      .then(setShipments)
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function fetchRates() {
    setStatus('Fetching rates from Shippo…');
    const auth = getAdminAuth();
    try {
      const res = await apiFetch<{ rates: ShippingRateOption[] }>(`/api/admin/orders/${params.id}/shipping/rates`, {
        token: auth?.token
      });
      setRates(res.rates);
      setStatus(null);
    } catch (err) {
      setStatus(
        err instanceof ApiError
          ? `Could not fetch rates: ${err.message}`
          : 'Could not fetch rates — check the Shippo API token is configured, and that this order has a shipping address yet.'
      );
    }
  }

  async function buyLabel(rateObjectId: string, provider: string) {
    setStatus('Buying label…');
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/orders/${params.id}/shipping/label`, {
        method: 'POST',
        token: auth?.token,
        body: { rateObjectId, carrier: provider, returnLabel: false }
      });
      setStatus('Label purchased — order marked as shipped.');
      load();
    } catch (err) {
      setStatus(err instanceof ApiError ? `Could not purchase the label: ${err.message}` : 'Could not purchase the label.');
    }
  }

  async function cancelOrder() {
    if (!confirm('Cancel this order? This refunds the customer in full via Stripe and restocks the items.')) return;
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/orders/${params.id}/cancel`, { method: 'POST', token: auth?.token });
      load();
    } catch {
      setStatus('Could not cancel this order.');
    }
  }

  if (!order) return <p className="text-ink/50">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="page-heading">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-6 text-sm text-ink/50">{order.email}</p>

      {order.shippingAddressValid === false && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">⚠ This shipping address may not be deliverable</p>
          <p className="mt-1 text-amber-700">
            {order.shippingAddressValidationNote ?? 'Shippo could not verify this address.'} Buying a label may fail until this is
            corrected with the customer.
          </p>
        </div>
      )}

      <div className="card divide-y divide-line">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between p-4 text-sm">
            <span className="text-ink">
              {item.productName} {item.variantAttributes ? `(${item.variantAttributes})` : ''} × {item.quantity}
            </span>
            <span className="text-ink">${item.lineTotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {(order.status === 'PENDING' || order.status === 'PAID') && (
        <div className="mt-4">
          <button onClick={cancelOrder} className="btn-secondary py-1.5 text-xs text-red-700">
            Cancel order (refund + restock)
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-ink/40">
        Refunds for shipped orders go through the returns queue, not this page.
      </p>

      {shipments.filter((s) => !s.returnLabel).length > 0 && (
        <div className="card mt-8 p-6">
          <p className="label mb-3">Label{shipments.length > 1 ? 's' : ''} purchased</p>
          <div className="space-y-2">
            {shipments
              .filter((s) => !s.returnLabel)
              .map((s) => (
                <div key={s.id} className="rounded-md border border-line p-3 text-sm">
                  <p className="text-ink">
                    {s.carrier} — tracking <span className="font-medium">{s.trackingNumber}</span>
                  </p>
                  <div className="mt-2 flex gap-4">
                    {s.labelUrl && (
                      <a href={s.labelUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        Download / print label
                      </a>
                    )}
                    {s.trackingUrl && (
                      <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        Track package
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="card mt-8 p-6">
        <p className="label mb-3">Shipping</p>
        <button onClick={fetchRates} className="btn-secondary">
          Get shipping rates
        </button>
        {status && <p className="mt-3 text-sm text-ink/60">{status}</p>}
        <div className="mt-4 space-y-2">
          {rates.map((r) => (
            <div key={r.rateObjectId} className="flex items-center justify-between rounded-md border border-line p-3 text-sm">
              <span className="text-ink">
                {r.provider} {r.serviceLevel} — {r.amount} {r.currency} ({r.estimatedDays ?? '?'} days)
              </span>
              <button onClick={() => buyLabel(r.rateObjectId, r.provider)} className="btn-primary px-3 py-1.5 text-xs">
                Buy label
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
