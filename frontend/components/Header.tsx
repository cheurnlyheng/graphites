'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './cart/CartContext';
import { SearchModal } from './SearchModal';
import { CategoryMegaMenu } from './CategoryMegaMenu';
import { apiFetch } from '@/lib/api';
import { featuredLinks, type FeaturedLink } from '@/lib/home-anchors';
import { getRecentOrderIds } from '@/lib/orders';
import type { HomeSectionResponse } from '@/lib/types';

export function Header() {
  const { openCart, itemCount } = useCart();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [featured, setFeatured] = useState<FeaturedLink[]>([]);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);
  const [showOrdersMenu, setShowOrdersMenu] = useState(false);
  const ordersMenuRef = useRef<HTMLDivElement>(null);

  // Re-checked on every navigation (not just on mount) -- the header stays mounted across route
  // changes, so this is what picks up a brand-new order id right after the order page itself saves
  // it, without needing a full page reload.
  useEffect(() => {
    setRecentOrderIds(getRecentOrderIds());
  }, [pathname]);

  // Closes the "recent orders" dropdown on an outside click -- the pill itself toggles it, so this
  // only needs to watch for clicks that land outside the whole menu+trigger container.
  useEffect(() => {
    if (!showOrdersMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (ordersMenuRef.current && !ordersMenuRef.current.contains(e.target as Node)) {
        setShowOrdersMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOrdersMenu]);

  useEffect(() => {
    let isMounted = true;
    // The landing page's product rows (the hanging rail, and any curated row) are listed in the nav too.
    apiFetch<HomeSectionResponse[]>('/api/home-sections')
      .then((blocks) => {
        if (isMounted && Array.isArray(blocks)) setFeatured(featuredLinks(blocks));
      })
      .catch(() => {
        // no featured links on error -- the nav just shows the brand + "see all"
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <header className="fixed top-3 sm:top-5 left-0 right-0 z-40 px-3 sm:px-6 flex items-center justify-between pointer-events-none">
        {/* Left: Brand Pill + 5 Categories + See All Button (Rains style) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Brand Logo Pill */}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-4 sm:px-5 py-2 sm:py-2.5 border border-black/5 shadow-sm transition-all active:scale-95"
          >
            <span className="text-xs sm:text-sm font-black tracking-tight text-[#10100F] uppercase">
              GRAPHITES
            </span>
          </Link>

          {/* Featured Items & See All Pill Bar (Desktop / Tablet) */}
          <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3 py-1.5 border border-black/5 shadow-sm transition-all">
            {featured.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="px-2.5 py-1 text-xs font-bold tracking-tight text-[#10100F]/75 hover:text-[#10100F] uppercase transition-colors"
              >
                {item.title}
              </Link>
            ))}
            <button
              onClick={() => setIsMenuOpen(true)}
              type="button"
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 hover:bg-[#10100F] hover:text-white text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
            >
              <span>SEE ALL</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            type="button"
            className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3.5 py-2 border border-black/5 shadow-sm text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
          >
            <span>MENU</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Right: Search & Cart Pills (Rains style) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Search Button Pill */}
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 border border-black/5 shadow-sm text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <span className="hidden xs:inline sm:inline">SEARCH</span>
          </button>

          {/* Order Button Pill -- only shown once there's at least one order to link to. A single
              remembered order links straight there; more than one opens a dropdown, since a guest
              with several orders could otherwise only ever reach whichever one they viewed last. */}
          {recentOrderIds.length === 1 && (
            <Link
              href={`/orders/${recentOrderIds[0]}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 border border-black/5 shadow-sm text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <span className="hidden sm:inline">ORDER</span>
            </Link>
          )}

          {recentOrderIds.length > 1 && (
            <div className="relative" ref={ordersMenuRef}>
              <button
                onClick={() => setShowOrdersMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 border border-black/5 shadow-sm text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
                <span className="hidden sm:inline">ORDERS</span>
              </button>
              {showOrdersMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-black/5 bg-white shadow-float overflow-hidden z-50">
                  {recentOrderIds.map((id) => (
                    <Link
                      key={id}
                      href={`/orders/${id}`}
                      onClick={() => setShowOrdersMenu(false)}
                      className="block px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#10100F]/80 hover:bg-black/5 border-b border-black/5 last:border-0 transition-colors"
                    >
                      Order #{id.slice(0, 8).toUpperCase()}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart Button Pill -- icon-only on mobile (with a small count badge) since the full
              "CART (n)" label alongside Search/Orders pills made this row too tight on narrow phones. */}
          <button
            onClick={openCart}
            aria-label={`Cart with ${itemCount} items`}
            className="relative inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 border border-black/5 shadow-sm text-xs font-bold tracking-tight text-[#10100F] uppercase transition-all active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993z"
              />
            </svg>
            <span className="hidden sm:inline">CART ({itemCount})</span>
            {itemCount > 0 && (
              <span className="sm:hidden absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10100F] text-[9px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Quick Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Rains-inspired Mega Menu */}
      <CategoryMegaMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} featured={featured} />
    </>
  );
}

