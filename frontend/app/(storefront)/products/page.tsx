import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductFilterBar } from '@/components/ProductFilterBar';
import type { CategoryResponse, PageResponse, ProductSummaryResponse, ProductDetailResponse } from '@/lib/types';

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

  let products: (ProductSummaryResponse & { images?: string[] })[] = [];
  try {
    const page = await apiFetch<PageResponse<ProductSummaryResponse>>(`/api/products?${params.toString()}`);
    if (page?.content && page.content.length > 0) {
      products = await Promise.all(
        page.content.map(async (p) => {
          try {
            const detail = await apiFetch<ProductDetailResponse>(`/api/products/${p.slug}`);
            const backendImages = detail?.images && detail.images.length > 0
              ? detail.images.map((img) => img.url).filter(Boolean)
              : [];
            return {
              ...p,
              images: backendImages.length > 0 ? backendImages : (p.thumbnailUrl ? [p.thumbnailUrl] : [])
            };
          } catch {
            return {
              ...p,
              images: p.thumbnailUrl ? [p.thumbnailUrl] : []
            };
          }
        })
      );
    }
  } catch {
    products = [];
  }

  let categories: CategoryResponse[] = [];
  try {
    categories = await apiFetch<CategoryResponse[]>('/api/categories');
  } catch {
    categories = [];
  }

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
              : 'Add some products from the admin panel to populate the catalog.'}
          </p>
          <div className="mt-6 flex gap-4">
            <Link href="/products" className="btn-secondary text-xs">
              Clear Filters
            </Link>
            <Link href="/admin/products/new" className="btn-primary text-xs">
              Add Product (Admin)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
