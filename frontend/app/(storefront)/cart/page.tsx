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

  if (loading) return <p className="text-ink/50">Loading cart…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 text-center">
        <div className="border border-line bg-paper-pure p-12 text-center">
          <p className="text-xs uppercase tracking-widest font-bold text-ink mb-2">Your cart is empty</p>
          <p className="text-xs text-ink/50 max-w-sm mx-auto">Discover our vintage-inspired tees, hoodies, and pants.</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex text-xs">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-20 grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="page-heading mb-6">Your cart</h1>
        <div className="card divide-y divide-line">
          {cart.items.map((item) => {
            const itemImg =
              item.imageUrl ||
              getStoredVariantImage(item.productVariantId) ||
              productThumbnails[item.productName.toLowerCase()];

            return (
              <div key={item.cartItemId} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4 min-w-0">
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
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-black/30 font-mono">
                        GRAPHITES
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{item.productName}</p>
                    {item.variantAttributes && <p className="text-sm text-ink/50">{item.variantAttributes}</p>}
                    <p className="mt-1 text-sm text-ink/50">${item.unitPrice.toFixed(2)} each</p>
                    {!item.inStock && <p className="mt-1 text-xs font-medium text-red-600">Not enough stock available</p>}
                  </div>
                </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={0}
                  defaultValue={item.quantity}
                  onBlur={(e) => updateQty(item.cartItemId, Number(e.target.value))}
                  className="input w-16 text-center"
                />
                <p className="w-20 text-right font-medium text-ink">${item.lineTotal.toFixed(2)}</p>
                <button
                  onClick={() => removeItem(item.cartItemId)}
                  aria-label="Remove item"
                  className="text-ink/40 transition-colors hover:text-red-600"
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
      </div>

      <div>
        <div className="card sticky top-24 space-y-4 p-6">
          <h2 className="section-heading">Summary</h2>
          <div className="flex justify-between text-sm text-ink/70">
            <span>Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-ink/40">Delivery method and shipping cost are chosen on the next step.</p>
          <button onClick={checkout} className="btn-primary w-full">
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
