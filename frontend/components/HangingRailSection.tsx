'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { mediaUrl } from '@/lib/api';
import type { SectionProduct } from '@/lib/types';

// % of image height between the image's top edge and the hanger hook's top (transparent padding).
// Used for products that don't have a hook percent set yet, so the rail still looks reasonable.
const DEFAULT_HOOK_PERCENT = 12;

// How many garments show at once. The admin can pick as many products as they want into one rail; the
// storefront pages through them this many at a time (arrow on desktop, one swipe on mobile). 3 side by
// side is too cramped below Tailwind's sm breakpoint (640px), so mobile shows 2 instead.
const PAGE_SIZE_DESKTOP = 3;
const PAGE_SIZE_MOBILE = 2;
const MOBILE_BREAKPOINT_QUERY = '(max-width: 639px)';

// Reserved space, in px, between the rail row's own top edge and the rail line/garments. Pairing
// overflow-x-auto (needed for the horizontal paging) with no overflow-y set forces the browser to clip
// the Y axis too (mixing 'hidden'/'auto' on one axis with 'visible' on the other isn't allowed -- the
// visible one silently becomes 'auto', which still clips) -- so a garment pulled up to align its hook
// with the rail can get its top sliced off once that pull-up is large enough to reach this element's own
// top edge. This buffer gives it somewhere to retreat into first. Sized for hook percentages up to
// MAX_EFFECTIVE_HOOK_PERCENT of the tallest garment image (680px) -- a t-shirt photo measured at ~18%
// silently plateaued at the old 15% cap (looked like the input did nothing), so both were raised together.
// NOTE: this must stay >= MAX_EFFECTIVE_HOOK_PERCENT% of 680px, or the clipping bug comes back -- don't
// change one without the other.
const RAIL_TOP_BUFFER_PX = 80;
// Hard ceiling on the pull-up itself, independent of the buffer above -- so a stray admin typo (e.g. 90
// instead of 9) can't blow past the reserved buffer and clip again regardless of how generous it is.
const MAX_EFFECTIVE_HOOK_PERCENT = 20;
// Gap between a garment's hem and its floor shadow -- matches the old `mt-2` spacing this replaces.
const SHADOW_GAP_PX = 8;

function Garment({
  product,
  index,
  entered,
  floorPx,
  onMeasureDrop
}: {
  product: SectionProduct;
  index: number;
  entered: boolean;
  // Shared floor line (px below the rail) every hanging garment's shadow sits on, so garments with
  // different hook percentages (different amounts of transparent space above the garment in their own
  // photo) don't each show their shadow at a different height. Null until a garment has reported its own
  // drop -- see HangingRailSection.
  floorPx: number | null;
  onMeasureDrop: (productId: string, dropPx: number) => void;
}) {
  const src = product.hangingImageUrl ?? product.thumbnailUrl;
  const hook = product.hangingHookPercent ?? DEFAULT_HOOK_PERCENT;
  // Only a real hanging-photo cutout should get the hook-aligned hang/swing treatment -- a plain thumbnail
  // used as a fallback has no hanger in it, so animating it the same way would look like a mistake.
  const isHangingPhoto = product.hangingImageUrl != null;

  const imgRef = useRef<HTMLImageElement>(null);
  const [imgHeight, setImgHeight] = useState<number | null>(null);

  // The image's CSS height is a fixed vh value (with a max-height cap), so its rendered height doesn't depend
  // on the actual photo -- but it does depend on viewport size, so it's measured rather than computed from the
  // Tailwind classes. Re-measures on resize so a hook set for desktop still lines up after the layout reflows.
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el || !isHangingPhoto) return;
    const measure = () => setImgHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHangingPhoto]);

  // A CSS percentage margin-top resolves against the *containing block's width*, not this element's own
  // height (a well-known CSS quirk) -- for a portrait photo those are very different numbers, which is why
  // the hook position looked like it wasn't doing anything. Using the measured height in pixels instead makes
  // "18% from the top" actually mean 18% of this image's own rendered height.
  const effectiveHook = Math.min(hook, MAX_EFFECTIVE_HOOK_PERCENT);
  const hookOffsetPx = imgHeight != null ? -(effectiveHook / 100) * imgHeight : 0;
  // How far this garment's own hem sits below the rail once hung from its hook -- reported up so the whole
  // rail can share one floor line (the deepest drop among the visible garments) instead of each shadow
  // tracking its own photo's framing.
  useEffect(() => {
    if (!isHangingPhoto || imgHeight == null) return;
    onMeasureDrop(product.id, imgHeight * (1 - effectiveHook / 100));
  }, [isHangingPhoto, imgHeight, effectiveHook, product.id, onMeasureDrop]);

  return (
    <div className="shrink-0 " >
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        // flow-root (not block) so a hanging photo's negative pull-up margin can't collapse with this
        // element's own top margin -- without it, this box's rendered top edge shifted up by the same
        // amount as the pull-up, so floorPx (measured relative to this box) landed at a different screen
        // position for every garment instead of a shared one.
        className="group relative flow-root cursor-pointer"
      >
        {src ? (
          <div
            className={isHangingPhoto && entered ? 'animate-hang motion-reduce:animate-none' : undefined}
            style={
              isHangingPhoto
                ? {
                    marginTop: `${hookOffsetPx}px`,
                    transformOrigin: `50% ${effectiveHook}%`,
                    // Before this page of the rail has scrolled into view, sit exactly at the animation's 0%
                    // keyframe (faded out, lifted off the rail) instead of playing on mount -- swapping in the
                    // animation class once visible starts from this same pose, so there's no jump.
                    ...(entered
                      ? { animationDelay: `${300 + index * 160}ms` }
                      : { opacity: 0, transform: 'translateY(-55vh) rotate(-3deg)' })
                  }
                : undefined
            }
          >
            <div
              // Ambient idle sway -- keeps drifting forever once the entrance settles, so the rack never
              // looks frozen. Starts after the hang animation's own duration (2.2s) plus this item's entry
              // stagger, and each item gets a slightly different period so they don't all sway in lockstep.
              className={isHangingPhoto && entered ? 'animate-sway motion-reduce:animate-none' : undefined}
              style={
                isHangingPhoto
                  ? {
                      transformOrigin: `50% ${effectiveHook}%`,
                      ...(entered
                        ? {
                            animationDelay: `${300 + index * 160 + 2200}ms`,
                            animationDuration: `${4.4 + (index % 3) * 0.6}s`
                          }
                        : undefined)
                    }
                  : undefined
              }
            >
              <div
                className={isHangingPhoto ? 'group-hover:animate-swing motion-reduce:animate-none' : undefined}
                style={isHangingPhoto ? { transformOrigin: `50% ${effectiveHook}%` } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic aspect ratio varies per cutout */}
                <img
                  ref={imgRef}
                  src={mediaUrl(src)}
                  alt={product.name}
                  draggable={false}
                  className={`block h-auto select-none ${
                    isHangingPhoto
                      ? 'w-[40vw] sm:w-[26vw] max-h-[680px] max-w-[440px]'
                      : 'w-[36vw] sm:w-[24vw] max-h-[560px] max-w-[380px] rounded-2xl object-cover shadow-sm'
                  }`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex aspect-square w-[36vw] sm:w-[24vw] max-h-[560px] max-w-[380px] items-center justify-center rounded-2xl border border-dashed border-[#10100F]/20 bg-white/40 px-3 text-center font-sans text-xs uppercase tracking-wider text-[#10100F]/40">
            No photo yet
          </div>
        )}

        {/* Floor shadow (does not swing). Hanging photos pin it to the shared floorPx line so every garment's
            shadow sits at the same height regardless of its own hook offset; the plain-thumbnail fallback has
            no hook math to correct for, so it just sits directly under the image as before. */}
        {isHangingPhoto ? (
          <div
            className="absolute inset-x-0 mx-auto h-3 w-1/2 rounded-[50%] bg-black/20 blur-md transition-opacity duration-300"
            style={{
              top: floorPx != null ? `${floorPx + SHADOW_GAP_PX}px` : undefined,
              opacity: floorPx != null ? 1 : 0
            }}
          />
        ) : (
          <div className="mx-auto mt-2 h-3 w-1/2 rounded-[50%] bg-black/20 blur-md" />
        )}

        {/* Chat-style pop-up */}
        <div
          role="tooltip"
          className="pointer-events-none absolute inset-x-0 top-full z-30 mx-auto mt-3 w-max origin-top scale-50 rounded-2xl bg-[#10100F] px-4 py-2.5 text-left text-white opacity-0 shadow-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#10100F]" />
          <p className="relative font-sans text-[13px] font-medium leading-tight">{product.name}</p>
          <p className="relative mt-1 font-sans text-[12px] font-light leading-none text-neutral-300">${product.price.toFixed(2)}</p>
        </div>
      </Link>
    </div>
  );
}

/** One screen's worth of garments (up to PAGE_SIZE) -- the unit the rail pages through. Its entrance plays
 * the first time it's actually on screen, whether that's because the whole section just scrolled into the
 * page's view (page 0) or because the visitor paged/swiped over to it (any later page) -- both are exactly
 * "this page became visible," and a plain viewport-rooted observer catches both: an element's bounding rect
 * already reflects the vertical page scroll AND the rail's own horizontal scroll, so no custom root is needed
 * -- deliberately NOT rooted at the rail's own scroller, which only clips horizontally (overflow-x-auto has
 * no vertical clip), so that root reported every page as "visible" the instant it mounted, before the section
 * had even scrolled into the page's view. */
function RailPage({
  products,
  floorPx,
  onMeasureDrop
}: {
  products: SectionProduct[];
  floorPx: number | null;
  onMeasureDrop: (productId: string, dropPx: number) => void;
}) {
  const pageRef = useRef<HTMLLIElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <li
      ref={pageRef}
      className="flex w-full shrink-0 snap-start items-start justify-center gap-3 px-[4vw] sm:gap-6"
    >
      {products.map((p, i) => (
        <Garment key={p.id} product={p} index={i} entered={entered} floorPx={floorPx} onMeasureDrop={onMeasureDrop} />
      ))}
    </li>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** The boutique's whole shop on one screen: every product hanging on a rail, admin-titled and described, with
 * clicking a garment going straight to its product detail page. Built for a catalog too small for a browsable
 * grid to make sense (see HomeSectionType.HANGING_RAIL). The header and description sit centered above the
 * rail. The admin can pick any number of products; the rail shows a few at a time (3 on desktop, 2 on
 * mobile) and pages through the rest -- an arrow on desktop, one swipe on mobile (both just move the
 * native scroll-snap by one page width). */
export function HangingRailSection({ id, title, description, products }: { id?: string; title: string | null; description: string | null; products: SectionProduct[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // Starts matching the desktop page size on both server and first client render (so hydration doesn't
  // mismatch), then corrects to the real viewport right after mount -- below the fold, so this happens
  // well before anyone scrolls down to see it.
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DESKTOP);
  // Every hanging garment's own hem drop (px below the rail), keyed by product id -- the deepest one becomes
  // the shared floor line all shadows sit on (see Garment's onMeasureDrop). All pages are mounted at once
  // (paging just scrolls), so one shared value works across the whole rail, not just one page at a time.
  const [drops, setDrops] = useState<Map<string, number>>(new Map());
  const handleMeasureDrop = useCallback((productId: string, dropPx: number) => {
    setDrops((prev) => (prev.get(productId) === dropPx ? prev : new Map(prev).set(productId, dropPx)));
  }, []);
  const floorPx = drops.size > 0 ? Math.max(...drops.values()) : null;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const update = () => setPageSize(mq.matches ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    // Garment photos load asynchronously and their rendered width depends on their own aspect ratio, so the
    // row's true scrollWidth isn't known until they've loaded -- a follow-up check catches that.
    const t = setTimeout(updateArrows, 400);
    window.addEventListener('resize', updateArrows);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, products.length, pageSize]);

  // Each page is exactly one container-width wide, so scrolling by exactly that distance lands on the next
  // page -- the same distance the native scroll-snap settles on after a swipe, so the arrow and a swipe agree.
  function scrollByPage(direction: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  const pages = chunk(products, pageSize);

  return (
    <section
      id={id}
      className="flex w-full scroll-mt-16 flex-col items-center pt-24 pb-14 sm:pt-32 sm:pb-20 font-sans text-[#10100F]"
      style={{ background: 'radial-gradient(ellipse at center, #F3F3F1 0%, #EFEFED 55%, #E4E4E1 100%)' }}
    >
      {(title || description) && (
        <div className="mb-6 max-w-xl px-4 text-center sm:mb-8">
          {title && (
            <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-tight text-[#10100F] sm:text-4xl md:text-5xl">
              {title}
            </h2>
          )}
          {description && <p className="mt-3 text-sm text-[#10100F]/60 sm:text-base">{description}</p>}
        </div>
      )}

      <div className="relative w-full ">
        {/* Rail -- offset down by the reserved buffer, not flush with this wrapper's own top */}
        <div className="absolute inset-x-0 z-10 h-0.5 bg-[#222]" style={{ top: RAIL_TOP_BUFFER_PX }} />

        {canPrev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByPage(-1)}
            style={{ top: `calc(${RAIL_TOP_BUFFER_PX}px + 30vh)` }}
            className="absolute left-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#10100F] shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 sm:left-4 sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        {canNext && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByPage(1)}
            style={{ top: `calc(${RAIL_TOP_BUFFER_PX}px + 30vh)` }}
            className="absolute right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#10100F] shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 sm:right-4 sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        <ul
          ref={scroller}
          onScroll={updateArrows}
          style={{ paddingTop: RAIL_TOP_BUFFER_PX }}
          className="relative z-10 flex snap-x snap-mandatory overflow-x-auto pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pages.map((pageProducts, i) => (
            <RailPage
              key={pageProducts.map((p) => p.id).join('-') || i}
              products={pageProducts}
              floorPx={floorPx}
              onMeasureDrop={handleMeasureDrop}
            />
          ))}
        </ul>
      </div>
    </section >
  );
}
