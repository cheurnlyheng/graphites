'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [buying, setBuying] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  // State updates land after the click handler returns, so two clicks in quick succession would both still see
  // `buying === false`. The ref flips immediately, so a double-click can only ever start one purchase.
  const buyingRef = useRef(false);

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
    if (buyingRef.current) return;
    buyingRef.current = true;
    setBuying(true);
    setStatus('Buying label…');
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/orders/${params.id}/shipping/label`, {
        method: 'POST',
        token: auth?.token,
        body: { rateObjectId, carrier: provider, returnLabel: false }
      });
      setRates([]);
      setStatus('Label purchased — order marked as shipped.');
      load();
    } catch (err) {
      setStatus(err instanceof ApiError ? `Could not purchase the label: ${err.message}` : 'Could not purchase the label.');
    } finally {
      buyingRef.current = false;
      setBuying(false);
    }
  }

  /** For an order still PENDING here: asks Stripe whether it was really paid (a lost webhook leaves paid orders
   * stuck as PENDING). Never marks anything paid unless Stripe says so. */
  async function checkPayment() {
    setCheckingPayment(true);
    setStatus('Checking with Stripe…');
    const auth = getAdminAuth();
    try {
      const updated = await apiFetch<OrderResponse>(`/api/admin/orders/${params.id}/sync-payment`, {
        method: 'POST',
        token: auth?.token
      });
      setOrder(updated);
      setStatus(
        updated.status === 'PENDING'
          ? 'Stripe has no completed payment for this order — the customer never finished checkout.'
          : 'Stripe confirmed the payment — this order is now paid.'
      );
    } catch (err) {
      setStatus(err instanceof ApiError ? `Could not check with Stripe: ${err.message}` : 'Could not check with Stripe.');
    } finally {
      setCheckingPayment(false);
    }
  }

  async function cancelOrder() {
    setCancelling(true);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/orders/${params.id}/cancel`, {
        method: 'POST',
        token: auth?.token,
        body: { reason: cancelReason.trim() || null }
      });
      setShowCancelForm(false);
      setCancelReason('');
      load();
    } catch {
      setStatus('Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  }

  if (!order) {
    return (
      <div className="w-full max-w-[1500px] py-16 text-center font-sans">
        <p className="text-sm text-[#10100F]/60">Loading order details…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1500px] space-y-6 font-sans">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/admin/orders"
              className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 hover:text-[#10100F] inline-flex items-center gap-1"
            >
              <span>← Back to Orders</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F]">
              Order #{order.id.slice(0, 8)}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-[#10100F]/60 mt-1">{order.email}</p>
        </div>

        {(order.status === 'PENDING' || order.status === 'PAID') && !showCancelForm && (
          <button
            onClick={() => setShowCancelForm(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-2xs"
          >
            <span>Cancel &amp; Refund</span>
          </button>
        )}
      </div>

      {/* Cancel & Refund confirmation, with an optional note that gets emailed to the customer */}
      {showCancelForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 space-y-3 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
            Cancel this order?
          </p>
          <p className="text-xs text-rose-800/80">
            This refunds the customer in full via Stripe and restocks the items. They&apos;ll get a
            cancellation email — add a note below if you want to tell them why.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Optional note to the customer (e.g. item is out of stock, duplicate order)…"
            rows={2}
            className="w-full rounded-lg border border-rose-200 bg-white px-3.5 py-2.5 text-xs text-[#10100F] placeholder:text-[#10100F]/40 focus:border-rose-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={cancelOrder}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-2xs disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => {
                setShowCancelForm(false);
                setCancelReason('');
              }}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-white hover:bg-[#f3f3f1] text-[#10100F]/70 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {/* Address Validation Alert if Invalid */}
      {order.shippingAddressValid === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <span className="text-base leading-none">⚠</span>
          <div>
            <p className="font-bold uppercase tracking-wider">Address Verification Required</p>
            <p className="mt-0.5 text-amber-800">
              {order.shippingAddressValidationNote ?? 'Shippo could not verify this destination address.'} Buying a shipping label may fail until delivery details are confirmed with the customer.
            </p>
          </div>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items & Address) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table Card */}
          <div className="rounded-xl border border-[#e5ded2] bg-white overflow-hidden shadow-2xs">
            <div className="border-b border-[#e5ded2] bg-[#f3f3f1]/80 px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Order Items ({order.items.length})
              </h2>
              <span className="text-xs text-[#10100F]/60 font-medium">
                Created {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="divide-y divide-[#e5ded2]/80">
              {order.items.map((item) => (
                <div key={item.id} className="p-5 flex items-center justify-between gap-4 hover:bg-[#f3f3f1]/40 transition-colors">
                  <div>
                    <h3 className="font-bold text-sm text-[#10100F] uppercase tracking-tight">
                      {item.productName}
                    </h3>
                    {item.variantAttributes && (
                      <p className="text-xs text-[#10100F]/60 mt-0.5">
                        Attributes: {item.variantAttributes}
                      </p>
                    )}
                    <span className="inline-block mt-1 text-xs text-[#10100F]/70">
                      Qty: <span className="font-bold text-[#10100F]">{item.quantity}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base text-[#10100F]">
                      ${item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="border-t border-[#e5ded2] bg-[#f3f3f1]/80 p-5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70">
                Total Charged
              </span>
              <span className="text-xl font-extrabold text-[#10100F]">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Shipping & Fulfillment) */}
        <div className="space-y-6">
          {/* Purchased Shipments Card */}
          {shipments.filter((s) => !s.returnLabel).length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Purchased Labels ({shipments.filter((s) => !s.returnLabel).length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {shipments
                  .filter((s) => !s.returnLabel)
                  .map((s) => (
                    <div key={s.id} className="rounded-xl border border-emerald-200 bg-white p-3.5 text-xs shadow-2xs">
                      <p className="font-bold text-[#10100F]">
                        {s.carrier}
                      </p>
                      <p className="text-xs text-[#10100F]/70 mt-0.5">
                        Tracking: <span className="font-bold text-[#10100F]">{s.trackingNumber}</span>
                      </p>
                      <div className="mt-2.5 flex items-center gap-3">
                        {s.labelUrl && (
                          <a
                            href={s.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#10100F] text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                          >
                            <span>Print Label ↗</span>
                          </a>
                        )}
                        {s.trackingUrl && (
                          <a
                            href={s.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#10100F] hover:underline"
                          >
                            Track Package ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Shipping Rates & Label Purchase */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Shipping &amp; Dispatch
              </h3>
              <p className="text-xs text-[#10100F]/60 mt-1">
                Retrieve live carrier rates from Shippo and generate shipment labels.
              </p>
            </div>

            {order.status !== 'PAID' && (
              <p className="text-xs p-2.5 rounded-lg bg-amber-50 text-amber-900 font-medium">
                {order.status === 'PENDING' && (
                  <>
                    Waiting for payment. Labels can be bought once the order is paid. If the customer says they paid, ask Stripe:
                    <button
                      onClick={checkPayment}
                      disabled={checkingPayment}
                      className="mt-2 block rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {checkingPayment ? 'Checking…' : 'Check payment with Stripe'}
                    </button>
                  </>
                )}
                {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && 'A label has already been bought for this order — see Purchased Labels above.'}
                {order.status === 'CANCELLED' && 'This order was cancelled, so no label can be bought for it.'}
              </p>
            )}

            {order.status === 'PAID' && (
            <button
              onClick={fetchRates}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span>Get Shipping Rates</span>
            </button>
            )}

            {status && (
              <p className="text-xs p-2.5 rounded-lg bg-[#f3f3f1] text-[#10100F]/80 font-medium">
                {status}
              </p>
            )}

            {order.status === 'PAID' && rates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#e5ded2]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 block">
                  Available Rates
                </span>
                {rates.map((r) => (
                  <div
                    key={r.rateObjectId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#e5ded2] p-3 text-xs hover:border-[#10100F] transition-colors"
                  >
                    <div>
                      <p className="font-bold text-[#10100F]">
                        {r.provider} {r.serviceLevel}
                      </p>
                      <p className="text-xs text-[#10100F]/60 mt-0.5">
                        ${r.amount} {r.currency} • {r.estimatedDays ?? '?'} days
                      </p>
                    </div>
                    <button
                      onClick={() => buyLabel(r.rateObjectId, r.provider)}
                      disabled={buying}
                      className="rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shrink-0 active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {buying ? 'Buying…' : 'Buy Label'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
