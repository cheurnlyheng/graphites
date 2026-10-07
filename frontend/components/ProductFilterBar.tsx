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
    </div>
  );
}
