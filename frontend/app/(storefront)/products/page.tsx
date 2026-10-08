import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductFilterBar } from '@/components/ProductFilterBar';
import type { CategoryResponse, PageResponse, ProductSummaryResponse } from '@/lib/types';

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; categoryId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedSearchParams.search) params.set('search', resolvedSearchParams.search);
  if (resolvedSearchParams.categoryId) params.set('categoryId', resolvedSearchParams.categoryId);
  params.set('size', '36');

  // One list call now carries every product's full image array (see ProductSummaryResponse on the
  // backend) -- this used to also fetch each product's full detail individually just for its
  // photos, which meant a 2-item catalog still cost 1 + N backend round trips on every page load.
  const [products, categories] = await Promise.all([
    apiFetch<PageResponse<ProductSummaryResponse>>(`/api/products?${params.toString()}`)
      .then((page) => page?.content ?? [])
      .catch(() => [] as ProductSummaryResponse[]),
    apiFetch<CategoryResponse[]>('/api/categories').catch(() => [] as CategoryResponse[])
  ]);

  return (
    <div className="w-full min-h-screen pt-20 sm:pt-24 pb-20">
      {/* Header & Filter Bar with comfortable side padding */}
      <div className="px-4 sm:px-8 lg:px-12">
        <ProductFilterBar
          totalItems={products.length}
          currentSearch={resolvedSearchParams.search}
          categories={categories}
        />
      </div>

      {/* 4-Column Product Grid: ZERO margin-x, fills full screen width edge-to-edge like Rains */}
      {products.length > 0 ? (
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-0 sm:gap-px bg-[#e5ded2]/40 border-t border-b border-black/[0.06]">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mx-4 sm:mx-8 lg:mx-12 flex flex-col items-center justify-center border border-dashed border-line bg-paper-pure/50 p-16 text-center">
          <p className="font-heading text-lg font-semibold uppercase tracking-wider text-ink">
            No products found
          </p>
          <p className="mt-1 text-xs text-ink/50">
            {resolvedSearchParams.search
              ? `No items match the query "${resolvedSearchParams.search}".`
              : 'New arrivals are on the way -- check back soon.'}
          </p>
          <div className="mt-6 flex gap-4">
            <Link href="/products" className="btn-secondary text-xs">
              Clear Filters
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
