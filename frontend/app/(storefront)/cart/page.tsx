'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getCartToken, setCartToken } from '@/lib/cart';
import type { CartResponse } from '@/lib/types';

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

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

  async function checkout() {
    setCheckingOut(true);
    try {
      const res = await apiFetch<{ checkoutUrl: string }>('/api/checkout/session', {
        method: 'POST',
        cartToken: getCartToken()
      });
      window.location.href = res.checkoutUrl;
    } catch {
      setCheckingOut(false);
      alert('Could not start checkout. Is the backend Stripe key configured?');
    }
  }

  if (loading) return <p className="text-ink/50">Loading cart…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line p-10 text-center">
        <p className="text-ink/60">Your cart is empty.</p>
        <Link href="/products" className="btn-primary mt-4 inline-flex">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="page-heading mb-6">Your cart</h1>
        <div className="card divide-y divide-line">
          {cart.items.map((item) => (
            <div key={item.cartItemId} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-ink">{item.productName}</p>
                {item.variantAttributes && <p className="text-sm text-ink/50">{item.variantAttributes}</p>}
                <p className="mt-1 text-sm text-ink/50">${item.unitPrice.toFixed(2)} each</p>
                {!item.inStock && <p className="mt-1 text-xs font-medium text-red-600">Not enough stock available</p>}
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
          ))}
        </div>
      </div>

      <div>
        <div className="card sticky top-24 space-y-4 p-6">
          <h2 className="section-heading">Summary</h2>
          <div className="flex justify-between text-sm text-ink/70">
            <span>Subtotal</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-ink/40">Tax and final shipping cost are calculated on the next step.</p>
          <button onClick={checkout} disabled={checkingOut} className="btn-primary w-full">
            {checkingOut ? 'Redirecting to Stripe…' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
