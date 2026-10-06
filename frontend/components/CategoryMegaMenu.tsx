'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { FeaturedLink } from '@/lib/home-anchors';
import type { CategoryResponse } from '@/lib/types';

interface CategoryMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  /** Landing-page rows (the hanging rail, and any curated row). Shown in the big type alongside "Shop all". */
  featured?: FeaturedLink[];
}

const LABEL_CLASS = 'text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 block mb-3';

function MenuLink({ href, label, onClose, size }: { href: string; label: string; onClose: () => void; size: 'large' | 'small' }) {
  return (
    <Link href={href} onClick={onClose} className="group block">
      <span
        className={`font-black uppercase tracking-tight text-white inline-block py-1 transition-all group-hover:translate-x-3 group-hover:opacity-40 ${
          size === 'large' ? 'text-3xl sm:text-5xl md:text-6xl' : 'text-xl sm:text-2xl md:text-3xl'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function CategoryMegaMenu({ isOpen, onClose, featured = [] }: CategoryMegaMenuProps) {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  // Fetched once, on open, rather than on mount -- this overlay is created once and toggled via
  // isOpen for the whole session, so mount-time would only ever catch categories that existed
  // when the page first loaded, not ones added since.
  useEffect(() => {
    if (!isOpen) return;
    apiFetch<CategoryResponse[]>('/api/categories')
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isOpen]);

  // Close on Escape key and handle scroll lock
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xl text-white flex flex-col overflow-y-auto animate-in fade-in duration-200">
      {/* Top Header Bar inside Mega Menu (Matches Rains overlay header) */}
      <div className="sticky top-0 z-20 w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-5 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        {/* Left: Brand + Inline Category Bar */}
        <div className="flex items-center gap-6 sm:gap-10">
          <Link
            href="/"
            onClick={onClose}
            className="text-base sm:text-lg font-black tracking-tight text-white uppercase hover:opacity-70 transition-opacity"
          >
            GRAPHITES
          </Link>

          {/* Top navigation featured-items row */}
          <nav className="hidden md:flex items-center gap-4 sm:gap-6">
            {featured.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-white hover:opacity-60 transition-opacity px-2 py-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 transition-transform group-hover:rotate-90">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>CLOSE</span>
        </button>
      </div>

      {/* Mega Menu Body: pure typography. Featured rows lead in the big type on the left; "Shop all" sits on
       * the right in smaller type of the same style. */}
      <div
        className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-20 grid gap-12 lg:gap-20 content-start ${
          featured.length > 0 ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''
        }`}
      >
        {featured.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <span className={LABEL_CLASS}>Featured</span>
            {featured.map((item) => (
              <MenuLink key={item.id} href={item.href} label={item.title} onClose={onClose} size="large" />
            ))}
          </div>
        )}

        <div className="max-w-3xl space-y-4 sm:space-y-6">
          <span className={LABEL_CLASS}>Shop</span>
          <MenuLink href="/products" label="Shop all" onClose={onClose} size={featured.length > 0 ? 'small' : 'large'} />
          {categories.map((c) => (
            <MenuLink
              key={c.id}
              href={`/products?categoryId=${c.id}`}
              label={c.name}
              onClose={onClose}
              size={featured.length > 0 ? 'small' : 'large'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
