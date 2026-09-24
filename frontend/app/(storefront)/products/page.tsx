import { apiFetch } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import type { PageResponse, ProductSummaryResponse } from '@/lib/types';

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; categoryId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedSearchParams.search) params.set('search', resolvedSearchParams.search);
  if (resolvedSearchParams.categoryId) params.set('categoryId', resolvedSearchParams.categoryId);
  params.set('size', '24');

  let products: ProductSummaryResponse[] = [];
  try {
    const page = await apiFetch<PageResponse<ProductSummaryResponse>>(`/api/products?${params.toString()}`);
    products = page.content;
  } catch {
    products = [];
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <h1 className="page-heading">Shop</h1>
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={resolvedSearchParams.search}
            placeholder="Search products..."
            className="input w-64"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink/50">No products found.</p>
      )}
    </div>
  );
}
