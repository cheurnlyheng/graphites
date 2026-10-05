'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import type { HomeSectionResponse } from '@/lib/types';

const arrowClass =
  'absolute top-[34%] z-20 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#10100F] shadow-lg border border-black/5 backdrop-blur-md transition-all hover:bg-white active:scale-95';

/** One curated homepage section: a title, a "View all" link, and a single row of hand-picked products
 * that scrolls sideways (swipe on touch screens, arrow buttons on desktop). */
export function HomeSectionRow({ section }: { section: HomeSectionResponse }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows]);

  function scrollByPage(direction: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  }

  return (
    <section aria-label={section.title ?? undefined} className="w-full">
      <div className="px-4 sm:px-8 lg:px-12 mb-5 flex items-baseline justify-between border-b border-black/10 pb-4">
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-[#10100F]">{section.title}</h2>
        <Link
          href="/products"
          className="text-xs font-bold uppercase tracking-wider text-[#10100F] hover:opacity-60 transition-opacity"
        >
          View All →
        </Link>
      </div>

      <div className="relative">
        {canPrev && (
          <button type="button" aria-label="Scroll left" onClick={() => scrollByPage(-1)} className={`${arrowClass} left-4`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        {canNext && (
          <button type="button" aria-label="Scroll right" onClick={() => scrollByPage(1)} className={`${arrowClass} right-4`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        <div
          ref={scroller}
          onScroll={updateArrows}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none border-t border-b border-black/[0.06]"
        >
          {section.products.map((p) => (
            <div key={p.id} className="w-[46vw] sm:w-[31vw] lg:w-[23vw] shrink-0 snap-start border-r border-black/[0.06]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
