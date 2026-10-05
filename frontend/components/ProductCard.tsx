'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mediaUrl } from '@/lib/api';
import type { ProductSummaryResponse } from '@/lib/types';

interface ExtendedProductSummary extends Omit<ProductSummaryResponse, 'status'> {
  images?: string[];
  status?: ProductSummaryResponse['status'];
}

export function ProductCard({ product }: { product: ExtendedProductSummary }) {
  // Use exact images from the backend:
  // If product has an images array, use it. Otherwise fall back to thumbnailUrl.
  const images = product.images && product.images.length > 0
    ? product.images
    : (product.thumbnailUrl ? [product.thumbnailUrl] : []);

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="group flex flex-col bg-[#fbfbfb] relative transition-colors">
      {/* Product Image Frame (3:4 ratio on neutral studio backdrop, Rains style) */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[3/4] w-full overflow-hidden bg-[#f3f3f1]"
      >
        {images.length > 0 ? (
          images.map((imgUrl, idx) => (
            <Image
              key={`${imgUrl}-${idx}`}
              src={mediaUrl(imgUrl)}
              alt={`${product.name} view ${idx + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              unoptimized
              className={`object-cover object-center transition-opacity duration-300 ${
                activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            />
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-widest text-[#10100F]/30">
            No image
          </div>
        )}

        {!product.inStock && (
          <span className="absolute right-3 top-3 z-20 bg-[#10100F] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
            Sold Out
          </span>
        )}
      </Link>

      {/* Details & Dots (Matching Rains.com exact layout from reference) */}
      <div className="px-3 sm:px-4 pt-3.5 pb-4 bg-[#fbfbfb]">
        {/* Line 1: Title on the left, Price on the right */}
        <div className="flex items-baseline justify-between gap-2">
          <Link href={`/products/${product.slug}`} className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm tracking-tight text-[#10100F] uppercase truncate hover:opacity-60 transition-opacity">
              {product.name}
            </h3>
          </Link>
          <span className="font-bold text-xs sm:text-sm tracking-tight text-[#10100F] shrink-0 font-mono">
            ${product.price.toFixed(0)}
          </span>
        </div>

        {/* Line 2: Black & Grey Dots representing each product detail image from backend */}
        {images.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 py-0.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveIndex(idx);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className={`h-2 w-2 rounded-full transition-all duration-150 ${
                  activeIndex === idx
                    ? 'bg-[#10100F] scale-125'
                    : 'bg-[#d1d5db] hover:bg-[#9ca3af]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
