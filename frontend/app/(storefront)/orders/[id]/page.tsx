'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch, mediaUrl, uploadReturnPhoto } from '@/lib/api';
import { saveLastOrderId } from '@/lib/orders';
import { StatusBadge } from '@/components/StatusBadge';
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import type { OrderResponse, PageResponse, ProductSummaryResponse } from '@/lib/types';

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Mirrors ReturnService.RETURN_WINDOW_DAYS / MIN_CONDITION_PHOTOS on the backend -- this is just an
// early, friendlier check so someone past the window doesn't fill out the whole form first; the
// backend enforces both for real regardless of what this shows.
const RETURN_WINDOW_DAYS = 30;
const MIN_RETURN_PHOTOS = 2;

type MilestoneState = 'done' | 'current' | 'upcoming';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    apiFetch<OrderResponse>(`/api/orders/${params.id}`)
      .then((data) => {
        setOrder(data);
        saveLastOrderId(data.id);
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  useEffect(() => {
    if (order?.items && order.items.length > 0 && Object.keys(productThumbnails).length === 0) {
      apiFetch<PageResponse<ProductSummaryResponse>>('/api/products?size=50')
        .then((page) => {
          if (page?.content) {
            const map: Record<string, string> = {};
            page.content.forEach((p) => {
              if (p.thumbnailUrl) {
                map[p.name.toLowerCase()] = p.thumbnailUrl;
                map[p.id] = p.thumbnailUrl;
              }
            });
            setProductThumbnails(map);
          }
        })
        .catch(() => {});
    }
  }, [order, productThumbnails]);

  function copyTrackingNumber(num: string) {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const url = await uploadReturnPhoto(params.id, file);
      setPhotos((p) => [...p, url]);
    } catch {
      setPhotoError('Could not upload that photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((u) => u !== url));
  }

  async function requestReturn() {
    const items = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([orderItemId]) => ({ orderItemId, quantity: 1, reason }));
    if (items.length === 0) {
      setStatus('Please select at least one item to return.');
      return;
    }
    if (photos.length < MIN_RETURN_PHOTOS) {
      setStatus(`Please upload at least ${MIN_RETURN_PHOTOS} photos showing the item's condition (front and back).`);
      return;
    }
    setSubmittingReturn(true);
    try {
      await apiFetch(`/api/orders/${params.id}/returns`, { method: 'POST', body: { items, reason, photoUrls: photos } });
      setStatus('Return requested successfully — we will email you with return label instructions once reviewed.');
      setSelected({});
      setReason('');
      setPhotos([]);
    } catch {
      setStatus('Could not submit the return request. Please try again or reach out to concierge.');
    } finally {
      setSubmittingReturn(false);
    }
  }

  async function cancelOrder() {
    setCancelling(true);
    try {
      const updated = await apiFetch<OrderResponse>(`/api/orders/${params.id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason.trim() || null }
      });
      setOrder(updated);
      setShowCancelForm(false);
      setCancelStatus(null);
    } catch {
      setCancelStatus('Could not cancel this order. Please try again or reach out to concierge.');
    } finally {
      setCancelling(false);
    }
  }

  const containerClass = 'mx-auto max-w-5xl px-4 sm:px-8 pt-32 pb-24 font-sans';

  if (notFound) {
    return (
      <div className={containerClass}>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] uppercase tracking-widest text-[#10100F]/40 block mb-3">
            Track Order
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#10100F] mb-4">
            Order Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#10100F]/60 max-w-sm mx-auto mb-8 leading-relaxed">
            We couldn&apos;t locate that order ID. Please double check the link from your confirmation email.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-[#10100F] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95"
          >
            Explore Catalog →
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={containerClass}>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="w-8 h-8 border-2 border-black/20 border-t-[#10100F] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-[#10100F]/60">
            Retrieving live order dispatch status…
          </p>
        </div>
      </div>
    );
  }

  // A return means sending back something you've physically received -- only possible once it's
  // actually arrived. Before that, cancelling the order outright is the right action instead (see
  // canCancel below); the two are mutually exclusive since an order can't be both PAID and DELIVERED.
  const canReturn = order.status === 'DELIVERED';
  const daysSinceDelivery = order.deliveredAt
    ? Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const returnWindowExpired = daysSinceDelivery !== null && daysSinceDelivery > RETURN_WINDOW_DAYS;
  const canCancel = order.status === 'PAID';
  const isShipped = order.status === 'SHIPPED' || order.status === 'DELIVERED';
  const isInTransit = order.inTransitAt != null;
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  // Compute step states for the milestone tracker
  const step1State: MilestoneState = 'done';
  const step2State: MilestoneState = isShipped || isDelivered ? 'done' : isCancelled ? 'upcoming' : 'current';
  const step3State: MilestoneState = isDelivered || isInTransit ? 'done' : isShipped ? 'current' : 'upcoming';
  const step4State: MilestoneState = isDelivered ? 'done' : isInTransit ? 'current' : 'upcoming';

  return (
    <div className={containerClass}>
      {/* Top Breadcrumb & Return to Store */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#10100F]/60 hover:text-[#10100F] transition-colors"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Back to Catalog</span>
        </Link>

        <button
          onClick={() => downloadReceiptPdf(order)}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#10100F]/50 hover:text-[#10100F] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>Download Receipt</span>
        </button>
      </div>

      {/* Order Header Banner */}
      <div className="border-b border-[#e5ded2] pb-8 mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <StatusBadge status={isInTransit && !isDelivered ? 'IN_TRANSIT' : order.status} />
          <span className="text-xs font-mono font-medium text-[#10100F]/50">
            Ordered {formatDate(order.createdAt)}
          </span>
          <span className="text-xs text-[#10100F]/30">·</span>
          <span className="text-xs text-[#10100F]/50">
            {order.email}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#10100F] mb-4">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h1>

        <p className="text-xs sm:text-sm text-[#10100F]/60 max-w-xl leading-relaxed">
          Real-time fulfillment tracking for your order. Milestones and courier dispatches update automatically as items move through our facility.
        </p>
      </div>

      {/* Special Notice for Cancelled or Pending */}
      {isCancelled && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/50 p-6 mb-10 text-rose-800 text-xs sm:text-sm">
          <p className="font-bold uppercase tracking-wider mb-1">Order Cancelled</p>
          <p className="text-rose-700/80">This order was cancelled. If you believe this is in error, please contact our support team.</p>
        </div>
      )}

      {order.status === 'PENDING' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-6 mb-10 text-amber-800 text-xs sm:text-sm">
          <p className="font-bold uppercase tracking-wider mb-1">Awaiting Payment Confirmation</p>
          <p className="text-amber-700/80">We are confirming your payment with Stripe. This page will update automatically once verified.</p>
        </div>
      )}

      {/* Milestone Progress Tracker */}
      {!isCancelled && order.status !== 'PENDING' && (
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-10 mb-10 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#e5ded2]/70 pb-4 mb-8">
            <span className="text-sm font-bold uppercase tracking-wide text-[#10100F]">
              Fulfillment journey
            </span>
            <span className="text-[11px] text-[#10100F]/50">
              {isDelivered
                ? 'Delivered'
                : isShipped
                ? 'In Transit'
                : 'Packaging at Central Hub'}
            </span>
          </div>

          {/* Stepper Grid (Horizontal on Desktop, Stacked on Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
            {/* Step 1: Order Placed */}
            <div className="flex sm:flex-col items-start gap-4 sm:gap-3">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step1State === 'done'
                      ? 'bg-[#10100F] text-white'
                      : 'border-2 border-black/20 text-black/30'
                  }`}
                >
                  ✓
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold uppercase tracking-tight text-[#10100F]">
                  Order Placed
                </p>
                <p className="text-[11px] font-mono text-[#10100F]/50">
                  {formatDate(order.createdAt)}
                </p>
                <p className="text-[11px] text-[#10100F]/60 leading-tight">
                  Verified & authorized
                </p>
              </div>
            </div>

            {/* Step 2: Preparing */}
            <div className="flex sm:flex-col items-start gap-4 sm:gap-3">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step2State === 'done'
                      ? 'bg-[#10100F] text-white'
                      : step2State === 'current'
                      ? 'border-2 border-[#10100F] bg-white text-[#10100F]'
                      : 'border-2 border-black/15 text-black/30'
                  }`}
                >
                  {step2State === 'done' ? (
                    '✓'
                  ) : step2State === 'current' ? (
                    <span className="w-2 h-2 rounded-full bg-[#10100F] animate-ping" />
                  ) : (
                    '2'
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-extrabold uppercase tracking-tight ${step2State === 'upcoming' ? 'text-[#10100F]/40' : 'text-[#10100F]'}`}>
                  Processing & Packing
                </p>
                <p className="text-[11px] text-[#10100F]/60 leading-tight">
                  {isShipped
                    ? `Packed & transferred to carrier`
                    : 'Packing at central logistics hub'}
                </p>
              </div>
            </div>

            {/* Step 3: Shipped */}
            <div className="flex sm:flex-col items-start gap-4 sm:gap-3">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step3State === 'done'
                      ? 'bg-[#10100F] text-white'
                      : step3State === 'current'
                      ? 'border-2 border-[#10100F] bg-white text-[#10100F]'
                      : 'border-2 border-black/15 text-black/30'
                  }`}
                >
                  {step3State === 'done' ? (
                    '✓'
                  ) : step3State === 'current' ? (
                    <span className="w-2 h-2 rounded-full bg-[#10100F] animate-ping" />
                  ) : (
                    '3'
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-extrabold uppercase tracking-tight ${step3State === 'upcoming' ? 'text-[#10100F]/40' : 'text-[#10100F]'}`}>
                  Dispatched in Transit
                </p>
                {isShipped && (
                  <p className="text-[11px] font-mono text-[#10100F]/50">
                    {isInTransit ? formatDate(order.inTransitAt) : formatDate(order.shippedAt) || 'Preparing for pickup'}
                  </p>
                )}
                <p className="text-[11px] text-[#10100F]/60 leading-tight">
                  {isShipped && order.carrier
                    ? isInTransit
                      ? `Picked up by ${order.carrier} -- on its way`
                      : `Label created -- awaiting ${order.carrier} pickup`
                    : 'Assigned to courier'}
                </p>
              </div>
            </div>

            {/* Step 4: Delivered */}
            <div className="flex sm:flex-col items-start gap-4 sm:gap-3">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step4State === 'done'
                      ? 'bg-emerald-600 text-white'
                      : step4State === 'current'
                      ? 'border-2 border-[#10100F] bg-white text-[#10100F]'
                      : 'border-2 border-black/15 text-black/30'
                  }`}
                >
                  {step4State === 'done' ? (
                    '✓'
                  ) : step4State === 'current' ? (
                    <span className="w-2 h-2 rounded-full bg-[#10100F] animate-ping" />
                  ) : (
                    '4'
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-extrabold uppercase tracking-tight ${step4State === 'upcoming' ? 'text-[#10100F]/40' : 'text-[#10100F]'}`}>
                  Delivered
                </p>
                {isDelivered && (
                  <p className="text-[11px] font-mono text-emerald-700 font-bold">
                    {formatDate(order.deliveredAt)}
                  </p>
                )}
                <p className="text-[11px] text-[#10100F]/60 leading-tight">
                  {isDelivered ? 'Handed to recipient' : 'Pending final drop-off'}
                </p>
              </div>
            </div>
          </div>

          {/* Live Carrier Tracking Action Card (if shipped) */}
          {isShipped && (
            <div className="mt-8 pt-6 border-t border-[#e5ded2] bg-[#fbfbfb] -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#10100F]/40">
                    Carrier Information
                  </span>
                  {order.carrier && (
                    <span className="text-xs font-bold uppercase tracking-wider text-[#10100F] bg-black/5 px-2 py-0.5 rounded">
                      {order.carrier}
                    </span>
                  )}
                </div>

                {order.trackingNumber ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#10100F]">
                      {order.trackingNumber}
                    </span>
                    <button
                      onClick={() => copyTrackingNumber(order.trackingNumber!)}
                      type="button"
                      className="text-xs font-mono uppercase tracking-wider text-[#10100F]/60 hover:text-[#10100F] underline transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#10100F]/60">Package scan received by carrier.</p>
                )}
              </div>

              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10100F] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
                >
                  <span>Track on Carrier Website</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main 2-Column Content */}
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Left Column: Ordered Items List */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between border-b border-[#e5ded2] pb-3 mb-4">
              <span className="text-sm font-bold uppercase tracking-wide text-[#10100F]">
                Items in this shipment ({order.items.length})
              </span>
              <span className="text-[11px] text-[#10100F]/40">
                Studio Authenticated
              </span>
            </div>

            <div className="divide-y divide-[#e5ded2] border-b border-[#e5ded2]">
              {order.items.map((item) => {
                const itemImg = productThumbnails[item.productName.toLowerCase()];
                return (
                  <div key={item.id} className="py-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[#f4f4f2] border border-black/5">
                        {itemImg ? (
                          <Image
                            src={mediaUrl(itemImg)}
                            alt={item.productName}
                            fill
                            sizes="80px"
                            unoptimized
                            className="object-cover object-center"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-black/30 tracking-widest">
                            GRAPHITES
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="min-w-0">
                        <p className="font-semibold text-[#10100F] text-base truncate">
                          {item.productName}
                        </p>
                        {item.variantAttributes && (
                          <span className="inline-block mt-1 text-[11px] font-medium text-[#10100F]/60 bg-black/5 px-2 py-0.5 rounded">
                            {item.variantAttributes}
                          </span>
                        )}
                        <p className="mt-1.5 text-xs text-[#10100F]/50">
                          Qty {item.quantity} · ${item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[#10100F] tracking-tight font-mono">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancel Order Section -- only before it ships; once it's on its way, see Returns below */}
          {canCancel && (
            <div className="rounded-xl border border-[#e5ded2] bg-[#fbfbfb] p-6 sm:p-8">
              {!showCancelForm ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#10100F] mb-1">
                      Need to cancel?
                    </h3>
                    <p className="text-xs text-[#10100F]/60">
                      This order hasn&apos;t shipped yet -- you can cancel it now for a full refund.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCancelForm(true)}
                    type="button"
                    className="text-xs font-bold uppercase tracking-wider text-[#10100F] underline underline-offset-2 decoration-[#10100F]/40 hover:decoration-[#10100F] transition-colors shrink-0"
                  >
                    Cancel my order
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[#e5ded2] pb-3">
                    <span className="text-sm font-bold uppercase tracking-wide text-[#10100F]">
                      Cancel this order
                    </span>
                    <button
                      onClick={() => setShowCancelForm(false)}
                      type="button"
                      className="text-xs uppercase text-[#10100F]/40 hover:text-[#10100F]"
                    >
                      Never mind
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#10100F]/55">
                      Reason (optional)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Ordered the wrong size"
                      rows={3}
                      className="w-full rounded-lg border border-[#e3e3e3] bg-white p-3 text-sm text-[#10100F] placeholder:text-[#10100F]/30 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus:border-[#10100F] focus:outline-none focus:ring-[3px] focus:ring-[#10100F]/10"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={cancelOrder}
                      disabled={cancelling}
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-800 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
                    </button>
                    {cancelStatus && (
                      <p className="text-xs font-medium text-rose-700">
                        {cancelStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Returns & Exchange Section -- only once it's actually arrived */}
          {canReturn && (
            <div className="rounded-xl border border-[#e5ded2] bg-[#fbfbfb] p-6 sm:p-8">
              {returnWindowExpired ? (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#10100F] mb-1">
                    Return window closed
                  </h3>
                  <p className="text-xs text-[#10100F]/60">
                    This order was delivered {daysSinceDelivery} days ago, which is past our {RETURN_WINDOW_DAYS}-day return
                    window. See our{' '}
                    <Link href="/returns-policy" className="underline hover:text-[#10100F]">
                      return policy
                    </Link>{' '}
                    for details.
                  </p>
                </div>
              ) : !showReturnForm ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#10100F] mb-1">
                      30-day returns
                    </h3>
                    <p className="text-xs text-[#10100F]/60">
                      Unworn items in original condition with tags attached are eligible for return within 30 days of delivery.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReturnForm(true)}
                    type="button"
                    className="text-xs font-bold uppercase tracking-wider text-[#10100F] underline underline-offset-2 decoration-[#10100F]/40 hover:decoration-[#10100F] transition-colors shrink-0"
                  >
                    Request a return
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[#e5ded2] pb-3">
                    <span className="text-sm font-bold uppercase tracking-wide text-[#10100F]">
                      Select items to return
                    </span>
                    <button
                      onClick={() => setShowReturnForm(false)}
                      type="button"
                      className="text-xs uppercase text-[#10100F]/40 hover:text-[#10100F]"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="divide-y divide-[#e5ded2] rounded-lg border border-[#e5ded2] bg-white overflow-hidden">
                    {order.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-3 p-3.5 hover:bg-[#fbfbfb] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!selected[item.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [item.id]: e.target.checked }))}
                          className="h-4 w-4 rounded border-line text-black focus:ring-black accent-black"
                        />
                        <span className="flex-1 text-sm font-medium text-[#10100F]">
                          {item.productName} {item.variantAttributes && `(${item.variantAttributes})`}
                        </span>
                        <span className="font-mono text-xs text-[#10100F]/70">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#10100F]/55">
                      Reason for return / exchange
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Size didn't fit, requesting an exchange for Size M"
                      rows={3}
                      className="w-full rounded-lg border border-[#e3e3e3] bg-white p-3 text-sm text-[#10100F] placeholder:text-[#10100F]/30 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus:border-[#10100F] focus:outline-none focus:ring-[3px] focus:ring-[#10100F]/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#10100F]/55">
                      Photos of the item&rsquo;s condition <span className="text-rose-700">(required)</span>
                    </label>
                    <p className="text-[11px] text-[#10100F]/50">
                      At least {MIN_RETURN_PHOTOS} photos (front and back) showing the item as it is now -- this is how we verify condition before approving a refund.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {photos.map((url) => (
                        <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e5ded2]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- just-uploaded proof photos, not a managed product image */}
                          <img src={mediaUrl(url)} alt="Return condition proof" className="h-full w-full object-cover" />
                          <button
                            onClick={() => removePhoto(url)}
                            type="button"
                            aria-label="Remove photo"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#e5ded2] text-[10px] font-bold uppercase tracking-wider text-[#10100F]/50 hover:border-[#10100F] hover:text-[#10100F] transition-colors">
                        {uploadingPhoto ? (
                          <span>Uploading…</span>
                        ) : (
                          <>
                            <span className="text-lg leading-none">+</span>
                            <span>Add Photo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={uploadingPhoto}
                          onChange={(e) => {
                            onPhotoChosen(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {photoError && <p className="text-xs font-medium text-rose-700">{photoError}</p>}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={requestReturn}
                      disabled={submittingReturn}
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-[#10100F] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {submittingReturn ? 'Submitting…' : 'Submit Return Request'}
                    </button>
                    {status && (
                      <p className="text-xs font-medium text-[#10100F]/80">
                        {status}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Receipt Summary */}
        <div className="sticky top-28 space-y-6">
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#10100F]">
                Receipt breakdown
              </h2>
              <StatusBadge status={isInTransit && !isDelivered ? 'IN_TRANSIT' : order.status} />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-[#10100F]/70">
                <span>Items Subtotal</span>
                <span className="font-mono font-medium text-[#10100F]">
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#10100F]/70">
                <span>Estimated Sales Tax</span>
                <span className="font-mono font-medium text-[#10100F]">
                  ${order.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#10100F]/70">
                <span>{order.selectedCarrier ? `${order.selectedCarrier} ${order.selectedServiceLevel ?? ''}`.trim() : 'Shipping'}</span>
                <span className="font-mono font-medium text-[#10100F]">
                  {order.shippingAmount === 0 ? 'Complimentary' : `$${order.shippingAmount.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-[#e5ded2] pt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wide text-[#10100F] block">
                    Total paid
                  </span>
                  <span className="text-[11px] text-[#10100F]/40">
                    Including all taxes &amp; duties
                  </span>
                </div>
                <span className="text-2xl font-bold tracking-tight text-[#10100F] font-mono">
                  ${order.total.toFixed(2)} <span className="text-xs font-sans font-bold text-[#10100F]/50">{order.currency || 'USD'}</span>
                </span>
              </div>
            </div>

            {/* Recipient summary */}
            <div className="rounded-lg bg-[#f9f9f8] p-4 border border-black/5 space-y-2 text-xs">
              <span className="text-[11px] text-[#10100F]/40 block">
                Order Destination
              </span>
              <p className="font-semibold text-[#10100F]">{order.email}</p>
              <p className="text-[11px] text-[#10100F]/60">
                {order.shippingAddressValidationNote || 'Verified delivery address'}
              </p>
            </div>

            <Link
              href="/products"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f5f5f3] transition-all active:scale-95"
            >
              <span>Continue Shopping</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
