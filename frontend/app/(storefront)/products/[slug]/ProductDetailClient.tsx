'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getCartToken, setCartToken } from '@/lib/cart';
import type { CartResponse, ProductDetailResponse } from '@/lib/types';

function comboKey(size: string | null, color: string | null) {
  return `${size ?? ''}::${color ?? ''}`;
}

export function ProductDetailClient({ product }: { product: ProductDetailResponse }) {
  const router = useRouter();

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );
  // The set of (size, color) pairs that actually exist as real variants -- everything else is a
  // combination that was never stocked, and must never be silently treated as "close enough."
  const validCombos = useMemo(() => new Set(product.variants.map((v) => comboKey(v.size, v.color))), [product]);

  const firstValidSizeFor = (c: string | null) => sizes.find((s) => validCombos.has(comboKey(s, c))) ?? null;

  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [size, setSize] = useState<string | null>(() => (sizes.length > 0 ? firstValidSizeFor(colors[0] ?? null) : null));
  const [status, setStatus] = useState<string | null>(null);

  // Color drives the photos, so it's picked first; sizes not sold in that color are disabled
  // (shown, not hidden -- so it's clear they exist for other colors) rather than selectable.
  const availableSizesForColor = useMemo(
    () => sizes.filter((s) => validCombos.has(comboKey(s, colors.length === 0 ? null : color))),
    [sizes, colors, color, validCombos]
  );

  function selectColor(c: string) {
    setColor(c);
    if (sizes.length > 0 && (!size || !validCombos.has(comboKey(size, c)))) {
      setSize(firstValidSizeFor(c));
    }
  }

  const selectedVariant = product.variants.find(
    (v) => v.size === (sizes.length === 0 ? null : size) && v.color === (colors.length === 0 ? null : color)
  );

  const images = product.images.filter((img) => !img.colorGroup || img.colorGroup === color);
  const displayImages = images.length > 0 ? images : product.images;

  async function addToCart() {
    if (!selectedVariant) return;
    setStatus('Adding…');
    try {
      const cart = await apiFetch<CartResponse>('/api/cart/items', {
        method: 'POST',
        body: { productVariantId: selectedVariant.id, quantity: 1 },
        cartToken: getCartToken()
      });
      if (cart.cartToken) setCartToken(cart.cartToken);
      setStatus('Added to cart ✓');
    } catch {
      setStatus('Could not add to cart.');
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      <div className="grid grid-cols-2 gap-3">
        {displayImages.length === 0 && (
          <div className="col-span-2 flex aspect-square items-center justify-center rounded-lg bg-line/40 text-sm text-ink/30">
            No image
          </div>
        )}
        {displayImages.map((img) => (
          <div key={img.id} className="aspect-square overflow-hidden rounded-lg bg-line/40">
            <Image src={img.url} alt={product.name} width={500} height={500} unoptimized className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      <div>
        <h1 className="page-heading">{product.name}</h1>
        <p className="mt-2 text-xl text-accent">${product.price.toFixed(2)}</p>
        {product.description && <p className="mt-4 whitespace-pre-line leading-relaxed text-ink/70">{product.description}</p>}

        {colors.length > 0 && (
          <div className="mt-8">
            <p className="label">Color{color ? `: ${color}` : ''}</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => selectColor(c)}
                  className={`rounded-md border px-3.5 py-1.5 text-sm transition-colors ${
                    color === c ? 'border-ink bg-ink text-paper' : 'border-line text-ink hover:border-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-5">
            <p className="label">Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const available = availableSizesForColor.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => available && setSize(s)}
                    disabled={!available}
                    title={available ? undefined : `Not available${color ? ` in ${color}` : ''}`}
                    className={`rounded-md border px-3.5 py-1.5 text-sm transition-colors ${
                      !available
                        ? 'cursor-not-allowed border-line text-ink/30 line-through'
                        : size === s
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={addToCart}
          disabled={!selectedVariant || selectedVariant.stockQty <= 0}
          className="btn-primary mt-8 w-full"
        >
          {!selectedVariant ? 'Select options' : selectedVariant.stockQty <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
        {status && <p className="mt-3 text-sm text-ink/60">{status}</p>}
        <button onClick={() => router.push('/cart')} className="btn-ghost mt-4">
          View cart →
        </button>
      </div>
    </div>
  );
}
