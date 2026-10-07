'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch, mediaUrl } from '@/lib/api';
import { getCartToken, setCartToken, getStoredVariantImage } from '@/lib/cart';
import type { CartResponse, PageResponse, ProductSummaryResponse } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<CartResponse>('/api/cart', { cartToken: getCartToken() });
      if (data.cartToken) setCartToken(data.cartToken);
      setCart(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (cart?.items && cart.items.length > 0 && Object.keys(productThumbnails).length === 0) {
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
  }, [cart, productThumbnails]);

  async function updateQty(itemId: string, quantity: number) {
    if (quantity <= 0) {
      await apiFetch(`/api/cart/items/${itemId}`, { method: 'DELETE', cartToken: getCartToken() });
    } else {
      await apiFetch(`/api/cart/items/${itemId}`, { method: 'PATCH', body: { quantity }, cartToken: getCartToken() });
    }
    load();
  }

  async function removeItem(itemId: string) {
    await apiFetch(`/api/cart/items/${itemId}`, { method: 'DELETE', cartToken: getCartToken() });
    load();
  }

  function checkout() {
    router.push('/checkout');
  }

  const containerClass = 'mx-auto max-w-5xl px-4 sm:px-8 pt-32 pb-24 font-sans';

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="w-8 h-8 border-2 border-black/20 border-t-[#10100F] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-[#10100F]/60">Loading your cart…</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={containerClass}>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 sm:p-16 text-center max-w-xl mx-auto shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] uppercase tracking-widest text-[#10100F]/40 block mb-3">Cart</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#10100F] mb-4">Your cart is empty</h1>
          <p className="text-xs sm:text-sm text-[#10100F]/60 max-w-sm mx-auto mb-8 leading-relaxed">
            Discover our vintage-inspired tees, hoodies, and pants.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-[#10100F] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-95"
          >
            Continue Shopping →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] mb-8">Your Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        {/* Items */}
        <div className="lg:col-span-2 rounded-xl border border-[#e5ded2] bg-white divide-y divide-[#e5ded2] shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
          {cart.items.map((item) => {
            const itemImg =
              item.imageUrl ||
              getStoredVariantImage(item.productVariantId) ||
              productThumbnails[item.productName.toLowerCase()];

            return (
              <div key={item.cartItemId} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
                {/* Image + details -- always stays its own row on mobile */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#f4f4f2] border border-black/5">
                    {itemImg ? (
                      <Image
                        src={mediaUrl(itemImg)}
                        alt={item.productName}
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-black/30 font-mono tracking-widest">
                        GRAPHITES
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#10100F] text-sm sm:text-base truncate">{item.productName}</p>
                    {item.variantAttributes && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-[#10100F]/60 bg-black/5 px-2 py-0.5 rounded">
                        {item.variantAttributes}
                      </span>
                    )}
                    <p className="mt-1.5 text-xs text-[#10100F]/50">${item.unitPrice.toFixed(2)} each</p>
                    {!item.inStock && <p className="mt-1 text-xs font-bold text-rose-600">Not enough stock available</p>}
                  </div>
                </div>

                {/* Qty / price / remove -- wraps to its own row on mobile, inline on sm+ */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 shrink-0 pl-[4.5rem] sm:pl-0">
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.quantity}
                    onBlur={(e) => updateQty(item.cartItemId, Number(e.target.value))}
                    className="w-16 rounded-lg border border-[#e5ded2] bg-white px-2 py-2 text-center text-sm font-bold text-[#10100F] focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all"
                  />
                  <p className="w-16 sm:w-20 text-right font-bold text-[#10100F] font-mono text-sm">
                    ${item.lineTotal.toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    aria-label="Remove item"
                    className="text-[#10100F]/40 transition-colors hover:text-rose-600 shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12ZM10 11v6M14 11v6"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] space-y-4 lg:sticky lg:top-28">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#10100F] border-b border-[#e5ded2] pb-3">
            Summary
          </h2>
          <div className="flex justify-between text-sm text-[#10100F]/70">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-[#10100F]">${cart.subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-[#10100F]/40">Delivery method and shipping cost are chosen on the next step.</p>
          <button
            onClick={checkout}
            className="w-full inline-flex items-center justify-center rounded-lg bg-[#10100F] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
