'use client';

import { useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartContext';
import { mediaUrl } from '@/lib/api';
import type { ProductDetailResponse } from '@/lib/types';

function comboKey(size: string | null, color: string | null) {
  return `${size ?? ''}::${color ?? ''}`;
}

export function ProductDetailClient({ product }: { product: ProductDetailResponse }) {
  const { addItem, isMutating } = useCart();
  const sliderRef = useRef<HTMLDivElement>(null);

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );
  const validCombos = useMemo(
    () => new Set(product.variants.map((v) => comboKey(v.size, v.color))),
    [product]
  );

  const firstValidSizeFor = (c: string | null) =>
    sizes.find((s) => validCombos.has(comboKey(s, c))) ?? null;

  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [size, setSize] = useState<string | null>(() =>
    sizes.length > 0 ? firstValidSizeFor(colors[0] ?? null) : null
  );
  const [status, setStatus] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Only the selected color's angles, plus any image not tied to a specific color. Without this
  // filter, swiping through the slider after picking a color would drift into other colors' photos,
  // since the backend stores every color's images in one list ordered by sortOrder.
  const allImages = useMemo(() => {
    if (!product.images || product.images.length === 0) return [];
    if (!color) return product.images;
    const forColor = product.images.filter(
      (img) => !img.colorGroup || img.colorGroup.toLowerCase() === color.toLowerCase()
    );
    return forColor.length > 0 ? forColor : product.images;
  }, [product, color]);

  const availableSizesForColor = useMemo(
    () => sizes.filter((s) => validCombos.has(comboKey(s, colors.length === 0 ? null : color))),
    [sizes, colors, color, validCombos]
  );

  function scrollToSlide(index: number) {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const slideWidth = container.clientWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  }

  function handlePrev() {
    if (allImages.length <= 1) return;
    const prev = (activeIndex - 1 + allImages.length) % allImages.length;
    scrollToSlide(prev);
  }

  function handleNext() {
    if (allImages.length <= 1) return;
    const next = (activeIndex + 1) % allImages.length;
    scrollToSlide(next);
  }

  function handleScroll() {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const slideWidth = container.clientWidth;
    if (slideWidth > 0) {
      const newIndex = Math.round(container.scrollLeft / slideWidth);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < allImages.length) {
        setActiveIndex(newIndex);
      }
    }
  }

  function selectColor(c: string) {
    setColor(c);
    // The slider's image list itself switches to this color's photos (see `allImages` above), so
    // jump back to the first slide rather than searching the old color's list for a match.
    setActiveIndex(0);
    sliderRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    if (sizes.length > 0 && (!size || !validCombos.has(comboKey(size, c)))) {
      setSize(firstValidSizeFor(c));
    }
  }

  const selectedVariant = product.variants.find(
    (v) =>
      v.size === (sizes.length === 0 ? null : size) &&
      v.color === (colors.length === 0 ? null : color)
  );

  async function addToCart() {
    if (!selectedVariant) return;
    setStatus('Adding…');
    // allImages is already filtered to the selected color, so whichever photo is on screen is correct.
    const selectedImgUrl = allImages[activeIndex]?.url || allImages[0]?.url;
    const success = await addItem(selectedVariant.id, 1, selectedImgUrl);
    if (success) {
      setStatus(null);
    } else {
      setStatus('Could not add to cart.');
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-[#fbfbfb]">
      {/* SECTION 1: Product Image (40% width, full height, cropped, flush to left edge) */}
      <section className="w-full lg:w-[40%] h-[75vh] lg:h-screen lg:sticky lg:top-0 bg-[#ebe8e1] overflow-hidden relative select-none">
        {/* Floating Back to Products Navigation Arrow */}
        <Link
          href="/products"
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes('/products')) {
              e.preventDefault();
              window.history.back();
            }
          }}
          aria-label="Back to products"
          className="absolute left-4 sm:left-6 top-20 sm:top-24 z-30 inline-flex items-center gap-2 rounded-full bg-white/85 hover:bg-white text-[#10100F] backdrop-blur-md shadow-sm border border-black/5 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all hover:shadow-md hover:-translate-x-0.5 active:scale-95 group"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Products</span>
        </Link>
        {allImages.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center font-mono text-sm uppercase tracking-widest text-[#10100F]/30">
            No product image
          </div>
        ) : (
          <>
            {/* Horizontal Full-Height Image Slider */}
            <div
              ref={sliderRef}
              onScroll={handleScroll}
              className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
            >
              {allImages.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="min-w-full h-full snap-center relative flex items-center justify-center"
                >
                  <Image
                    src={mediaUrl(img.url)}
                    alt={`${product.name} angle ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    unoptimized
                    className="object-cover object-center w-full h-full"
                  />
                </div>
              ))}
            </div>

            {/* Floating Left Arrow Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/85 hover:bg-white text-[#10100F] backdrop-blur-md shadow-lg border border-black/5 flex items-center justify-center transition-all opacity-85 hover:opacity-100 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Floating Right Arrow Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/85 hover:bg-white text-[#10100F] backdrop-blur-md shadow-lg border border-black/5 flex items-center justify-center transition-all opacity-85 hover:opacity-100 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {/* Floating Bottom Pagination Dots */}
            {allImages.length > 1 && (
              <div className="absolute bottom-6 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/5 flex items-center gap-2 shadow-sm pointer-events-auto">
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToSlide(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-2 w-2 rounded-full transition-all ${
                        activeIndex === idx
                          ? 'bg-[#10100F] scale-125'
                          : 'bg-[#d1d5db] hover:bg-[#9ca3af]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </section>

      {/* SECTION 2: Product Details (60% width, generous breathing space, full height flow) */}
      <section className="w-full lg:w-[60%] px-6 sm:px-12 md:px-16 lg:px-20 xl:px-24 py-16 sm:py-24 lg:py-28 flex flex-col justify-center min-h-screen">
        <div className="max-w-2xl w-full space-y-9">
          {/* Eyebrow & Title & Price */}
          <div className="border-b border-[#e5ded2] pb-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#10100F]/50 block">
                Weatherproof Series
              </span>
              <Link
                href="/products"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes('/products')) {
                    e.preventDefault();
                    window.history.back();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#10100F]/50 hover:text-[#10100F] transition-colors group"
              >
                <span className="transition-transform group-hover:-translate-x-1">←</span>
                <span>Back to catalog</span>
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#10100F] uppercase">
              {product.name}
            </h1>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-[#10100F] pt-1">
              ${product.price.toFixed(2)}
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <div className="text-sm sm:text-base text-[#10100F]/70 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-baseline text-xs sm:text-sm">
                <span className="font-bold uppercase tracking-wider text-[#10100F]">
                  Color: <span className="font-medium text-[#10100F]/70">{color}</span>
                </span>
                <span className="text-xs font-mono text-[#10100F]/50">
                  {colors.length} {colors.length === 1 ? 'color' : 'colors'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => selectColor(c)}
                      className={`group flex items-center gap-2.5 px-4 py-2.5 border text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all ${
                        isSelected
                          ? 'border-[#10100F] bg-[#10100F] text-white shadow-sm'
                          : 'border-[#e5ded2] bg-white text-[#10100F] hover:border-[#10100F]'
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full border border-black/20 ${
                          isSelected ? 'bg-white' : 'bg-[#10100F]'
                        }`}
                      />
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-baseline text-xs sm:text-sm">
                <span className="font-bold uppercase tracking-wider text-[#10100F]">
                  Select Size: <span className="font-medium text-[#10100F]/70">{size || 'None'}</span>
                </span>
                <span className="text-xs font-mono text-[#10100F]/50 uppercase cursor-pointer hover:text-[#10100F]">
                  Size Guide
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {sizes.map((s) => {
                  const available = availableSizesForColor.includes(s);
                  const isSelected = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => available && setSize(s)}
                      disabled={!available}
                      className={`py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider border transition-all ${
                        !available
                          ? 'border-[#e5ded2] bg-[#f9f9f9] text-[#10100F]/30 line-through cursor-not-allowed'
                          : isSelected
                            ? 'border-[#10100F] bg-[#10100F] text-white shadow-sm'
                            : 'border-[#e5ded2] bg-white text-[#10100F] hover:border-[#10100F]'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add to Bag Action Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={addToCart}
              disabled={!selectedVariant || selectedVariant.stockQty <= 0 || isMutating}
              className="w-full bg-[#10100F] text-white py-4 sm:py-5 text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] shadow-md"
            >
              {!selectedVariant
                ? 'Select Options'
                : selectedVariant.stockQty <= 0
                  ? 'Out of Stock'
                  : isMutating
                    ? 'Adding to Bag…'
                    : 'Add to Bag'}
            </button>
            {status && (
              <p className="text-center text-xs font-mono uppercase tracking-wider text-[#10100F]/60">
                {status}
              </p>
            )}
          </div>

          {/* Technical Specifications Accordion */}
          <div className="border-t border-[#e5ded2] pt-8 space-y-5 text-xs sm:text-sm">
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-[#10100F] block">
                Technical Highlights
              </span>
              <ul className="list-disc pl-4 space-y-1.5 text-[#10100F]/70 pt-1">
                <li>Engineered for wet weather conditions and daily mobility.</li>
                <li>Waterproof polyurethane coated textile with welded seams.</li>
                <li>Breathable ventilation storm flap and adjustable hood drawstrings.</li>
                <li>Matte utilitarian hardware finish.</li>
              </ul>
            </div>

            <div className="border-t border-[#e5ded2]/60 pt-5 flex items-center justify-between text-xs text-[#10100F]/60 uppercase tracking-wider">
              <span>✦ 30-Day Hassle-Free Returns</span>
              <span>✦ Global Express Dispatch</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
