'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { PageResponse, ProductSummaryResponse } from '@/lib/types';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummaryResponse[]>([]);

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<PageResponse<ProductSummaryResponse>>('/api/admin/products?size=100', { token: auth.token })
      .then((p) => setProducts(p.content))
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-heading">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          New product
        </Link>
      </div>
      <div className="card divide-y divide-line">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between p-4 transition-colors hover:bg-paper">
            <p className="font-medium text-ink">{p.name}</p>
            <p className="text-sm text-ink/50">
              ${p.price.toFixed(2)} {!p.inStock && <span className="text-red-600">· Out of stock</span>}
            </p>
          </Link>
        ))}
        {products.length === 0 && <p className="p-6 text-center text-ink/50">No products yet.</p>}
      </div>
    </div>
  );
}
