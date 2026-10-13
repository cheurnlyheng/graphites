'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { LowStockVariant } from '@/lib/types';

export default function AdminRestockPage() {
  const router = useRouter();
  const [items, setItems] = useState<LowStockVariant[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<LowStockVariant[]>('/api/admin/products/low-stock', { token: auth.token })
      .then(setItems)
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Inventory
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              Restock
            </h1>
            <span className="text-sm font-semibold text-[#10100F]/50">({items.length} low)</span>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl">
            Variants at or below their restock threshold. An alert email also goes to{' '}
            <span className="font-semibold text-[#10100F]/80">graphites.world@gmail.com</span> the first time each
            one dips -- click through to add stock on the product's edit page.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-full border border-amber-300 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold">{items.length} need restocking</span>
          </div>
        )}
      </div>

      {/* Low Stock List */}
      <div className="rounded-2xl border border-[#e5ded2] bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-[11px] font-bold uppercase tracking-wider text-[#10100F]/70">
            <tr>
              <th className="py-3.5 px-6">Product</th>
              <th className="py-3.5 px-6">Variant</th>
              <th className="py-3.5 px-6">SKU</th>
              <th className="py-3.5 px-6 text-right">Stock / Threshold</th>
              <th className="py-3.5 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5ded2]">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 w-40 rounded-full bg-[#f3f3f1]" /></td>
                  <td className="py-4 px-6"><div className="h-3.5 w-20 rounded-full bg-[#f3f3f1]" /></td>
                  <td className="py-4 px-6"><div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-4 w-16 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-7 w-20 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-bold text-emerald-800">
                    ✓ Every variant is above its restock threshold
                  </div>
                </td>
              </tr>
            ) : (
              items.map((v) => (
                <tr key={v.variantId} className="hover:bg-[#f3f3f1]/40 transition-colors">
                  <td className="py-4 px-6 font-bold text-sm text-[#10100F]">
                    {v.productName}
                  </td>
                  <td className="py-4 px-6 text-xs text-[#10100F]/70">
                    {v.size || v.color ? [v.size, v.color].filter(Boolean).join(' / ') : '—'}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-[#10100F]/60">
                    {v.sku || '—'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-0.5 text-xs font-bold text-red-700">
                      {v.stockQty} / {v.lowStockThreshold}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/admin/products/${v.productId}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#e5ded2] bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] transition-all shadow-xs active:scale-95"
                    >
                      Add Stock →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
