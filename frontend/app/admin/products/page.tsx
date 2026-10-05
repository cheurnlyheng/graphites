'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch, mediaUrl } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { PageResponse, ProductSummaryResponse } from '@/lib/types';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' }
];

const STOCK_FILTERS = [
  { label: 'All Stock', value: '' },
  { label: 'In Stock', value: 'IN_STOCK' },
  { label: 'Out of Stock', value: 'OUT_OF_STOCK' }
];

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<PageResponse<ProductSummaryResponse>>('/api/admin/products?size=100', { token: auth.token })
      .then((p) => setProducts(p.content))
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term) && !p.slug.toLowerCase().includes(term)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (stockFilter === 'IN_STOCK' && !p.inStock) return false;
      if (stockFilter === 'OUT_OF_STOCK' && p.inStock) return false;
      return true;
    });
  }, [products, searchTerm, statusFilter, stockFilter]);

  return (
    <div className="w-full max-w-[1700px] space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Catalog Management
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              Products
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#10100F]/5 text-[#10100F]/70 border border-[#10100F]/10">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shrink-0 shadow-sm active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Add Product</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center border border-[#e5ded2] bg-white rounded-full px-4 py-2.5 max-w-md w-full shadow-2xs focus-within:border-[#10100F] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#10100F]/40 mr-2.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by title or slug..."
            className="w-full bg-transparent text-xs sm:text-sm text-[#10100F] placeholder:text-[#10100F]/40 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#10100F]/40 hover:text-[#10100F] text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all-status'}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                statusFilter === f.value
                  ? 'bg-[#10100F] text-white border-[#10100F]'
                  : 'bg-white text-[#10100F]/70 border-[#e5ded2] hover:border-[#10100F]'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="w-px h-4 bg-[#e5ded2] mx-1" />
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.value || 'all-stock'}
              onClick={() => setStockFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                stockFilter === f.value
                  ? 'bg-[#10100F] text-white border-[#10100F]'
                  : 'bg-white text-[#10100F]/70 border-[#e5ded2] hover:border-[#10100F]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Data Table with sticky header */}
      <div className="rounded-xl border border-[#e5ded2] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-xs font-bold uppercase tracking-wider text-[#10100F]/60 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-5 w-20">Media</th>
                <th className="py-3.5 px-5">Product Details</th>
                <th className="py-3.5 px-5">Slug</th>
                <th className="py-3.5 px-5">Price</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Inventory Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded2]/80">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-5">
                      <div className="h-14 w-12 rounded-lg bg-[#f3f3f1] border border-[#e5ded2]/50" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="h-4 w-36 rounded-full bg-[#f3f3f1]" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="h-4 w-14 rounded-full bg-[#f3f3f1]" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="h-5 w-16 rounded-full bg-[#f3f3f1]" />
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="h-5 w-20 rounded-full bg-[#f3f3f1]" />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="h-7 w-16 rounded-full bg-[#f3f3f1] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-[#10100F]/60">
                    <p className="font-semibold text-[#10100F]">No matching products found.</p>
                    <p className="text-xs text-[#10100F]/50 mt-1">Try refining your search term or add a new product.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f3f3f1]/50 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="relative h-14 w-12 rounded-lg bg-[#f3f3f1] border border-[#e5ded2] overflow-hidden shrink-0 shadow-2xs">
                        {p.thumbnailUrl ? (
                          <Image
                            src={mediaUrl(p.thumbnailUrl)}
                            alt={p.name}
                            fill
                            sizes="50px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] uppercase text-[#10100F]/30 font-medium">
                            N/A
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-bold text-sm text-[#10100F] hover:underline uppercase tracking-tight block"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#10100F]/60">
                      /{p.slug}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-sm text-[#10100F]">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-5">
                      {p.inStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>In Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                          <span>Out of Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[#e5ded2] bg-white text-[#10100F] hover:bg-[#10100F] hover:text-white transition-all shadow-2xs"
                      >
                        <span>Edit</span>
                        <span className="text-[10px]">→</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
