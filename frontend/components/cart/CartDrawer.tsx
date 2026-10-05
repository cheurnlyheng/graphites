'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { apiFetch, mediaUrl } from '@/lib/api';
import { getStoredVariantImage } from '@/lib/cart';
import type { PageResponse, ProductSummaryResponse, ProductDetailResponse } from '@/lib/types';

export function CartDrawer() {
  const router = useRouter();
  const { cart, isOpen, closeCart, updateQty, removeItem, itemCount, isMutating, addItem } = useCart();
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});
  const [recommendedProducts, setRecommendedProducts] = useState<ProductSummaryResponse[]>([]);
  const [addingRecommendedId, setAddingRecommendedId] = useState<string | null>(null);

  // Load catalog products for thumbnails and "Others also bought"
  useEffect(() => {
    if (isOpen) {
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

            // Filter out items already in cart for recommendations
            const inCartNames = new Set(cart?.items.map((i) => i.productName.toLowerCase()) || []);
            const available = page.content.filter((p) => !inCartNames.has(p.name.toLowerCase()));
            setRecommendedProducts(available.slice(0, 2));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, cart]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleCheckout() {
    closeCart();
    router.push('/checkout');
  }

  async function handleQuickAdd(product: ProductSummaryResponse) {
    setAddingRecommendedId(product.id);
    try {
      const detail = await apiFetch<ProductDetailResponse>(`/api/products/${product.slug}`);
      const firstVariant = detail.variants.find((v) => v.stockQty > 0) || detail.variants[0];
      if (firstVariant) {
        const img = detail.images?.[0]?.url || product.thumbnailUrl || undefined;
        await addItem(firstVariant.id, 1, img);
      }
    } catch (err) {
      console.error('Failed to quick add recommendation:', err);
    } finally {
      setAddingRecommendedId(null);
    }
  }

  if (!isOpen) return null;

  const subtotal = cart?.subtotal ?? 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-[420px] sm:max-w-[450px] bg-white border-l border-black/[0.08] flex flex-col shadow-2xl animate-slide-in-right">
          {/* Header matching Rains: "Shopping cart" + close X */}
          <div className="flex items-center justify-between border-b border-black/[0.08] px-6 py-4.5 bg-white">
            <h2 className="text-sm font-bold text-[#10100F]">Shopping cart</h2>
            <button
              onClick={closeCart}
              aria-label="Close cart"
              className="p-1 text-[#10100F]/60 hover:text-[#10100F] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-none">
            {!cart || cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-sm font-bold text-[#10100F]">Your shopping cart is empty</h3>
                <p className="mt-1.5 text-xs text-[#767676] max-w-xs">
                  Discover our vintage-inspired tees, hoodies, and pants.
                </p>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="mt-6 rounded-full bg-[#10100F] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                {/* 1. Cart Items List matching Rains */}
                <div className="divide-y divide-black/[0.06]">
                  {cart.items.map((item) => {
                    const itemImg =
                      item.imageUrl ||
                      getStoredVariantImage(item.productVariantId) ||
                      productThumbnails[item.productName.toLowerCase()];

                    return (
                      <div key={item.cartItemId} className="py-4.5 flex gap-4 items-start first:pt-0">
                        {/* Rounded Image Frame */}
                        <div className="relative h-28 w-24 shrink-0 rounded-xl overflow-hidden bg-[#f4f4f2] border border-black/5">
                          {itemImg ? (
                            <Image
                              src={mediaUrl(itemImg)}
                              alt={item.productName}
                              fill
                              sizes="96px"
                              unoptimized
                              className="object-cover object-center"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-black/30 font-mono">
                              GRAPHITES
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-28 py-0.5 mb-5">
                          <div>
                            <h3 className="text-sm font-bold text-[#10100F] truncate">
                              {item.productName}
                            </h3>
                            {item.variantAttributes && (
                              <p className="text-xs text-[#767676] mt-0.5 font-normal">
                                {item.variantAttributes.replace(/^Size\s*/i, '').replace(' / ', ' / ')}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm font-bold text-[#10100F] mt-1 font-mono">
                              ${item.unitPrice.toFixed(2)}
                            </p>
                            {!item.inStock && (
                              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mt-0.5">
                                Insufficient stock
                              </p>
                            )}
                          </div>

                          {/* Stepper & Remove matching Rains */}
                          <div className="flex items-center justify-between pt-1">
                            {/* Stepper with circular - and + buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
                                disabled={isMutating}
                                className="w-6 h-6 rounded-full bg-[#f2f2f0] hover:bg-[#e5e5e5] text-xs font-semibold flex items-center justify-center text-[#10100F] transition-colors disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-xs font-medium text-[#10100F] font-mono">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
                                disabled={isMutating}
                                className="w-6 h-6 rounded-full bg-[#f2f2f0] hover:bg-[#e5e5e5] text-xs font-semibold flex items-center justify-center text-[#10100F] transition-colors disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            {/* Clean Remove text link */}
                            <button
                              onClick={() => removeItem(item.cartItemId)}
                              className="text-xs text-[#767676] hover:text-[#10100F] underline-offset-2 hover:underline transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Delivery Row matching Rains */}
                <div className="py-3.5 border-y border-black/[0.08] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#10100F]">Delivery</span>
                  <span className="text-[#767676]">Calculated at checkout</span>
                </div>

                {/* 3. Others Also Bought Section matching Rains */}
                {recommendedProducts.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold text-[#10100F] mb-3.5">Others also bought</h3>
                    <div className="space-y-4">
                      {recommendedProducts.map((rec) => (
                        <div key={rec.id} className="flex gap-4 items-center">
                          <Link
                            href={`/products/${rec.slug}`}
                            onClick={closeCart}
                            className="relative h-24 w-20 shrink-0 rounded-xl overflow-hidden bg-[#f4f4f2] border border-black/5"
                          >
                            {rec.thumbnailUrl ? (
                              <Image
                                src={mediaUrl(rec.thumbnailUrl)}
                                alt={rec.name}
                                fill
                                sizes="80px"
                                unoptimized
                                className="object-cover object-center hover:scale-105 transition-transform"
                              />
                            ) : null}
                          </Link>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#10100F] truncate">{rec.name}</h4>
                            <p className="text-xs text-[#767676] mt-0.5">More options</p>
                            <p className="text-xs text-[#767676] mt-0.5 font-mono">${rec.price.toFixed(2)}</p>
                            <div className="mt-2">
                              <button
                                onClick={() => handleQuickAdd(rec)}
                                disabled={addingRecommendedId === rec.id}
                                className="inline-flex items-center justify-center rounded-full border border-black/80 hover:bg-black hover:text-white px-4 py-1.5 text-xs font-bold text-[#10100F] transition-all disabled:opacity-50"
                              >
                                {addingRecommendedId === rec.id ? 'Adding…' : 'Add to Cart'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Checkout Summary matching Rains */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-black/[0.08] bg-white p-6 space-y-4">
              {/* Subtotal row */}
              <div className="flex items-baseline justify-between text-xs sm:text-sm">
                <span className="font-bold text-[#10100F]">
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-bold font-mono text-[#10100F] text-sm">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              {/* View Cart link on left, Checkout pill button on right */}
              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="text-xs text-[#10100F] underline underline-offset-4 hover:opacity-60 transition-opacity font-normal"
                >
                  View Cart
                </Link>

                <button
                  onClick={handleCheckout}
                  disabled={isMutating}
                  className="rounded-full bg-[#2a2a2a] hover:bg-black text-white px-8 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
