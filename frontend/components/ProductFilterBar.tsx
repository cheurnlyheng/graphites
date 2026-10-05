'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CategoryResponse } from '@/lib/types';

interface ProductFilterBarProps {
  totalItems: number;
  currentSearch?: string;
  categories?: CategoryResponse[];
}

export function ProductFilterBar({ totalItems, currentSearch = '', categories = [] }: ProductFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get('search') || '';
  const activeCategoryId = searchParams.get('categoryId') || '';
  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  function handleCategoryClick(categoryId: string) {
    router.push(categoryId ? `/products?categoryId=${categoryId}` : '/products');
  }

  const pills = [{ label: 'All Items', id: '' }, ...categories.map((c) => ({ label: c.name, id: c.id }))];

  return (
    <div className="mb-6 pt-1 pb-2">
      {/* Title & Description matching Rains.com */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#10100F]">
          {activeQuery
            ? `Results for "${activeQuery}"`
            : activeCategory
              ? `${activeCategory.name} from GRAPHITES`
              : 'New Arrivals from GRAPHITES'}
        </h1>
        <p className="text-[13px] text-[#767676] mt-1 font-normal">
          Explore the latest from GRAPHITES. The collection offers a wide range of different styles.
        </p>
      </div>

      {/* Category Pills matching Rains.com (Thin outline, transparent background, sentence case) */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {pills.map((pill) => {
          const isActive = pill.id ? pill.id === activeCategoryId : !activeCategoryId && !activeQuery;

          return (
            <button
              key={pill.id || 'all'}
              onClick={() => handleCategoryClick(pill.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] transition-colors ${
                isActive
                  ? 'border border-[#10100F] text-[#10100F] font-medium bg-transparent'
                  : 'border border-[#e5e5e5] text-[#767676] font-normal hover:border-[#10100F] hover:text-[#10100F] bg-transparent'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Floating Center-Bottom "Filter" Pill (Iconic Rains.com element) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#2a2a2a] hover:bg-black text-white px-5 py-2.5 shadow-2xl text-[13px] font-medium transition-all active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <span>Filter</span>
        </button>
      </div>
    </div>
  );
}
