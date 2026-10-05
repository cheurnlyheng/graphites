'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch, mediaUrl } from '@/lib/api';
import { useCart } from '@/components/cart/CartContext';
import { StatusBadge } from '@/components/StatusBadge';
import type { OrderResponse, PageResponse, ProductSummaryResponse } from '@/lib/types';

const POLL_MS = 2500;
const MAX_POLLS = 16; // ~40 seconds before we stop and tell the customer what to do

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { refreshCart } = useCart();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    setGaveUp(false);

    async function check() {
      try {
        const latest = await apiFetch<OrderResponse>(`/api/orders/by-session/${sessionId}`);
        if (cancelled) return;
        setOrder(latest);
        setFailed(false);
        if (latest.status !== 'PENDING') {
          // CartContext fetches the cart exactly once, on mount -- which can easily race ahead of
          // payment confirmation (the backend clears cart items inside markPaid, which may not have
          // run yet at that first fetch). Force a fresh read now that payment is actually confirmed,
          // so the header/cart drawer stop showing items that no longer exist server-side.
          refreshCart();
          return;
        }
      } catch {
        if (cancelled) return;
        setFailed(true);
      }
      if (++polls >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(check, POLL_MS);
    }

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, attempt, refreshCart]);

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

  const containerClass = 'mx-auto max-w-5xl px-4 sm:px-8 pt-32 pb-24 font-sans';

  // 1. Missing Session
  if (!sessionId) {
    return (
      <div className={containerClass}>
        <div className="border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#10100F]/40 block mb-3">
            Checkout Session
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#10100F] mb-4">
            No Session Found
          </h1>
          <p className="text-xs sm:text-sm text-[#10100F]/60 max-w-sm mx-auto mb-8 leading-relaxed">
            We couldn&apos;t detect an active checkout session. If you recently completed an order, please check your email for confirmation.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#10100F] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95"
          >
            Explore Catalog →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading / Failed
  if (!order) {
    return (
      <div className={containerClass}>
        <div className="border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
          {failed && gaveUp ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 block mb-2 font-bold">
                Order Verification Delay
              </span>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#10100F] mb-3">
                Unable to Load Order
              </h1>
              <p className="text-xs text-[#10100F]/60 mb-6 leading-relaxed">
                We couldn&apos;t load your order right now. If you just paid, your card was not charged twice — try refreshing in a moment.
              </p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex items-center justify-center rounded-full bg-[#10100F] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95"
              >
                Try Again
              </button>
            </>
          ) : (
            <div className="py-8 space-y-4">
              <div className="w-8 h-8 border-2 border-black/20 border-t-[#10100F] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono uppercase tracking-widest text-[#10100F]/60">
                Verifying your payment with Stripe…
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Pending
  if (order.status === 'PENDING') {
    return (
      <div className={containerClass}>
        <div className="border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 font-bold block mb-2">
            Almost There
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#10100F] mb-3">
            Confirming Payment…
          </h1>
          {gaveUp ? (
            <>
              <p className="text-xs text-[#10100F]/60 mb-6 leading-relaxed">
                This is taking a bit longer than usual. If your card was charged, you do not need to pay again — your order will be confirmed as soon as Stripe completes verification.
              </p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex items-center justify-center rounded-full bg-[#10100F] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95"
              >
                Check Status Again
              </button>
            </>
          ) : (
            <p className="text-xs text-[#10100F]/60">
              This usually completes in a few seconds. Please keep this browser window open.
            </p>
          )}
        </div>
      </div>
    );
  }

  // 4. Confirmed / Paid Order Experience
  return (
    <div className={containerClass}>
      {/* Hero Confirmation Banner */}
      <div className="border-b border-[#e5ded2] pb-10 mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Order Confirmed
          </span>
          <span className="text-xs font-mono font-medium text-[#10100F]/50">
            ID: #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-xs font-mono text-[#10100F]/30">·</span>
          <span className="text-xs font-mono text-[#10100F]/50">
            {formatDate(order.createdAt)}
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#10100F] uppercase leading-[0.95] mb-5">
          Thank you for your order.
        </h1>

        <p className="text-sm sm:text-base text-[#10100F]/70 max-w-2xl leading-relaxed">
          Your order has been confirmed and transferred to our central logistics hub for packing. A digital receipt and live tracking updates have been dispatched to{' '}
          <span className="font-semibold text-[#10100F] underline decoration-[#10100F]/20 underline-offset-4">
            {order.email}
          </span>.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#10100F] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
          >
            <span>Track Delivery Status</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f5f5f3] transition-all active:scale-95"
          >
            Continue Shopping
          </Link>

          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#10100F]/70 hover:text-[#10100F] hover:bg-black/5 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.07-.37-2.18-.37-3.329 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.149-.13 2.259-.37 3.329m-15.26 0A8.003 8.003 0 0012 21a8.003 8.003 0 007.64-5.171m-15.28 0a8.003 8.003 0 010-3.658m15.28 3.658a8.003 8.003 0 000-3.658M9 12h6m-3-3v6" />
            </svg>
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Left Column: Ordered Items & Logistics Information */}
        <div className="space-y-10">
          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between border-b border-[#e5ded2] pb-3 mb-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#10100F]/60">
                Purchased Silhouettes ({order.items.length})
              </span>
              <span className="text-[11px] font-mono text-[#10100F]/40">
                Fulfilled by GRAPHITES
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
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-black/30 font-mono tracking-widest">
                            GRAPHITES
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="min-w-0">
                        <p className="font-extrabold uppercase tracking-tight text-[#10100F] text-base truncate">
                          {item.productName}
                        </p>
                        {item.variantAttributes && (
                          <span className="inline-block mt-1 text-[11px] font-mono font-medium uppercase tracking-wider text-[#10100F]/60 bg-black/5 px-2 py-0.5 rounded">
                            {item.variantAttributes}
                          </span>
                        )}
                        <p className="mt-1.5 text-xs text-[#10100F]/50 font-mono">
                          QTY {item.quantity} · ${item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[#10100F] tracking-tight">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics & Dispatch Info Grid */}
          <div className="grid gap-4 sm:grid-cols-3 border border-[#e5ded2] bg-[#fbfbfb] p-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#10100F]/40 block">
                Fulfillment Hub
              </span>
              <p className="text-xs font-bold uppercase tracking-tight text-[#10100F]">
                Central Dispatch
              </p>
              <p className="text-[11px] text-[#10100F]/60 leading-relaxed">
                Standard processing takes 1-2 business days.
              </p>
            </div>

            <div className="space-y-1 sm:border-l sm:border-[#e5ded2] sm:pl-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#10100F]/40 block">
                Courier Service
              </span>
              <p className="text-xs font-bold uppercase tracking-tight text-[#10100F]">
                Carbon-Neutral Express
              </p>
              <p className="text-[11px] text-[#10100F]/60 leading-relaxed">
                Tracking becomes active upon carrier scan.
              </p>
            </div>

            <div className="space-y-1 sm:border-l sm:border-[#e5ded2] sm:pl-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#10100F]/40 block">
                Assistance
              </span>
              <p className="text-xs font-bold uppercase tracking-tight text-[#10100F]">
                Customer Care
              </p>
              <p className="text-[11px] text-[#10100F]/60 leading-relaxed">
                Need to amend items? Reply directly to your receipt.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Receipt Summary */}
        <div className="sticky top-28 space-y-6">
          <div className="border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#10100F]">
                Receipt Breakdown
              </h2>
              <StatusBadge status={order.status} />
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
                <span>Express Courier Shipping</span>
                <span className="font-mono font-medium text-[#10100F]">
                  {order.shippingAmount === 0 ? 'Complimentary' : `$${order.shippingAmount.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-[#e5ded2] pt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold uppercase tracking-tight text-[#10100F] block">
                    Total Amount
                  </span>
                  <span className="text-[10px] font-mono text-[#10100F]/40 uppercase">
                    Including all taxes & duties
                  </span>
                </div>
                <span className="text-2xl font-black tracking-tight text-[#10100F] font-mono">
                  ${order.total.toFixed(2)} <span className="text-xs font-sans font-bold text-[#10100F]/50">{order.currency || 'USD'}</span>
                </span>
              </div>
            </div>

            {/* Payment security indicator */}
            <div className="rounded-lg bg-[#f9f9f8] p-3 flex items-center gap-3 border border-black/5 text-[11px] text-[#10100F]/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 shrink-0 text-[#10100F]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Encrypted Stripe checkout verification complete.</span>
            </div>

            <Link
              href={`/orders/${order.id}`}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#10100F] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
            >
              <span>View Tracking Page</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
