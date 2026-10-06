'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const trendingSearches = [
  'Graphic Tee',
  'Hoodie',
  'Cargo Pants',
  'Crewneck',
  'Vintage Wash',
  'Denim Jacket'
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    if (query?.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }

  function handleSearchTerm(term: string) {
    router.push(`/products?search=${encodeURIComponent(term)}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      {/* This wrapper spans the full screen (min-h-screen) and sits on top of the backdrop in
          paint order, so the backdrop's own onClick would never fire -- the click target here
          instead, with the modal box below stopping propagation so clicks inside it don't close it. */}
      <div
        onClick={onClose}
        className="relative min-h-screen flex items-start justify-center pt-20 px-4 sm:px-6"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-paper-pure border border-line shadow-float p-6 sm:p-8 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink/60">
              Quick Search
            </span>
            <button
              onClick={onClose}
              aria-label="Close search"
              className="text-xs font-mono uppercase tracking-wider text-ink/50 hover:text-ink transition-colors"
            >
              [ESC]
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="relative flex items-center border-b-2 border-ink pb-2">
              <input
                ref={inputRef}
                type="text"
                name="search"
                placeholder="Search tees, hoodies, pants..."
                className="w-full bg-transparent text-lg sm:text-xl font-medium text-ink placeholder:text-ink/30 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="p-2 text-ink hover:text-accent transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Quick recommendations */}
          <div className="mt-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-3">
              Popular Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSearchTerm(term)}
                  className="border border-line bg-paper px-3 py-1.5 text-xs text-ink/70 hover:text-ink hover:border-ink transition-colors font-medium"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
