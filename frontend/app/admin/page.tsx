'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAdminAuth } from '@/lib/auth';
import type { PageResponse, ProductSummaryResponse, OrderResponse, LowStockVariant } from '@/lib/types';

export default function AdminDashboard() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) return;

    // Load overview counts
    apiFetch<PageResponse<ProductSummaryResponse>>('/api/admin/products?size=1', { token: auth.token })
      .then((res) => setProductCount(res.totalElements ?? res.content.length))
      .catch(() => {});

    apiFetch<PageResponse<OrderResponse>>('/api/admin/orders?status=PAID&size=1', { token: auth.token })
      .then((res) => setOrderCount(res.totalElements ?? res.content.length))
      .catch(() => {});

    apiFetch<LowStockVariant[]>('/api/admin/inventory/low-stock', { token: auth.token })
      .then((res) => setLowStockCount(res.length))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-[1700px] space-y-10 font-sans">
      {/* Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50">
              GRAPHITES Console
            </span>
            <span className="text-xs text-[#10100F]/30">•</span>
            <span className="text-xs font-medium text-[#10100F]/50">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
            Operations Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Product</span>
          </Link>
          <Link
            href="/admin/orders?status=PAID"
            className="inline-flex items-center gap-2 rounded-full border border-[#e5ded2] bg-white hover:bg-[#f3f3f1] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#10100F] transition-all shadow-2xs active:scale-95"
          >
            <span>Fulfillment Queue</span>
            {orderCount !== null && orderCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {orderCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Products KPI */}
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 relative overflow-hidden shadow-2xs hover:shadow-xs transition-all group">
          <div className="flex items-center justify-between text-[#10100F]/60">
            <span className="text-xs font-bold uppercase tracking-wider">
              Active Catalog
            </span>
            <span className="w-8 h-8 rounded-full bg-[#f3f3f1] flex items-center justify-center text-[#10100F]/70 group-hover:bg-[#10100F] group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-4xl font-extrabold text-[#10100F] tracking-tight">
              {productCount !== null ? productCount : '—'}
            </span>
            <Link
              href="/admin/products"
              className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70 hover:text-[#10100F] inline-flex items-center gap-1 hover:underline"
            >
              <span>Manage</span>
              <span>→</span>
            </Link>
          </div>
          <p className="text-xs text-[#10100F]/55 mt-2">Active silhouettes published in catalog</p>
        </div>

        {/* Fulfillment KPI */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-6 relative overflow-hidden shadow-2xs hover:shadow-xs transition-all group">
          <div className="flex items-center justify-between text-amber-900/80">
            <span className="text-xs font-bold uppercase tracking-wider">
              Pending Dispatch
            </span>
            <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 group-hover:bg-amber-900 group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-4xl font-extrabold text-amber-800 tracking-tight">
              {orderCount !== null ? orderCount : '—'}
            </span>
            <Link
              href="/admin/orders?status=PAID"
              className="text-xs font-bold uppercase tracking-wider text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 hover:underline"
            >
              <span>Fulfill</span>
              <span>→</span>
            </Link>
          </div>
          <p className="text-xs text-amber-800/70 mt-2">Paid orders awaiting shipping label generation</p>
        </div>

        {/* Restock KPI */}
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 relative overflow-hidden shadow-2xs hover:shadow-xs transition-all group">
          <div className="flex items-center justify-between text-[#10100F]/60">
            <span className="text-xs font-bold uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <span className="w-8 h-8 rounded-full bg-[#f3f3f1] flex items-center justify-center text-[#10100F]/70 group-hover:bg-[#10100F] group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-4xl font-extrabold text-[#10100F] tracking-tight">
              {lowStockCount !== null ? lowStockCount : '0'}
            </span>
            <Link
              href="/admin/purchase-orders"
              className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70 hover:text-[#10100F] inline-flex items-center gap-1 hover:underline"
            >
              <span>Restock</span>
              <span>→</span>
            </Link>
          </div>
          <p className="text-xs text-[#10100F]/55 mt-2">Product variants below minimum threshold</p>
        </div>
      </div>

      {/* Main Administrative Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">
            Management Hubs
          </h2>
          <span className="text-xs font-medium text-[#10100F]/40">6 Core Systems</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <Link
            href="/admin/products"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                01
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Product Catalog
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Upload multi-angle imagery, manage color swatches, size matrices, pricing, and live inventory.
            </p>
          </Link>

          {/* Card 2 */}
          <Link
            href="/admin/orders"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                02
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Fulfillment &amp; Shipping
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Review customer orders, inspect delivery addresses, purchase Shippo labels, and record dispatch.
            </p>
          </Link>

          {/* Card 3 */}
          <Link
            href="/admin/returns"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                03
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Returns &amp; Exchanges
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Review claim tickets, inspect returned garments, restock into active inventory, and issue refunds.
            </p>
          </Link>

          {/* Card 4 */}
          <Link
            href="/admin/suppliers"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                04
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Supplier Directory
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Textile mills and manufacturing partners, factory contacts, lead time tracking, and purchase ties.
            </p>
          </Link>

          {/* Card 5 */}
          <Link
            href="/admin/purchase-orders"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                05
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Restock Purchase Orders
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Automated reorder triggers for depleted SKUs, shipment monitoring, and warehouse receiving.
            </p>
          </Link>

          {/* Card 6 */}
          <Link
            href="/"
            target="_blank"
            className="group rounded-xl border border-[#e5ded2] bg-white p-6 hover:border-[#10100F] hover:shadow-sm transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-[#f3f3f1] group-hover:bg-[#10100F] group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                06
              </span>
              <span className="text-sm text-[#10100F]/40 group-hover:text-[#10100F] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                ↗
              </span>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-tight text-[#10100F]">
              Customer Storefront
            </h3>
            <p className="mt-1.5 text-xs text-[#10100F]/65 leading-relaxed">
              Open live retail store in a separate tab to test hero banners, product grids, swatches, and cart drawer.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
