import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import type { PageResponse, ProductSummaryResponse } from '@/lib/types';

export default async function HomePage() {
  let products: ProductSummaryResponse[] = [];
  try {
    const page = await apiFetch<PageResponse<ProductSummaryResponse>>('/api/products?size=8');
    products = page.content;
  } catch {
    products = [];
  }

  return (
    <div>
      <section className="mb-12 border-b border-line pb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">New arrivals</p>
        <h1 className="page-heading">Fresh off the rack</h1>
        <p className="mt-3 max-w-md text-ink/60">Shipped from our own warehouse, straight to your door.</p>
        <Link href="/products" className="btn-primary mt-6 inline-flex">
          Browse all products
        </Link>
      </section>

      {products.length > 0 ? (
        <section className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink/50">
          No products yet — add some from the admin panel.
        </p>
      )}
    </div>
  );
}
