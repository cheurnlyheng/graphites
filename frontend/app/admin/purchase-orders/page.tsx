'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { LowStockVariant, PurchaseOrderResponse } from '@/lib/types';

export default function AdminPurchaseOrdersPage() {
  const router = useRouter();
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([]);
  const [drafts, setDrafts] = useState<PurchaseOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  function onAuthError(err: unknown) {
    if (isAdminAuthError(err)) {
      clearAdminAuth();
      router.push('/admin/login');
    }
  }

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch<LowStockVariant[]>('/api/admin/purchase-orders/low-stock', { token: auth.token }).then(setLowStock).catch(onAuthError),
      apiFetch<PurchaseOrderResponse[]>('/api/admin/purchase-orders', { token: auth.token }).then(setDrafts).catch(onAuthError)
    ]).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateNow() {
    setGenerating(true);
    const auth = getAdminAuth();
    try {
      await apiFetch('/api/admin/purchase-orders/generate-now', { method: 'POST', token: auth?.token });
      load();
    } finally {
      setGenerating(false);
    }
  }

  async function markSent(id: string) {
    setMarkingId(id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/purchase-orders/${id}/mark-sent`, { method: 'POST', token: auth?.token });
      load();
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="w-full max-w-[1700px] space-y-10 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-8">
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]/60 block mb-1.5">
            Inventory &amp; Restock Operations
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase font-sans">
              Restock &amp; Purchase Orders
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl font-sans">
            Automated threshold monitoring for depleted SKUs, batch generation for factory partners, and order lifecycle tracking.
          </p>
        </div>

        <button
          onClick={generateNow}
          disabled={generating}
          className="rounded-full bg-[#10100F] text-white px-6 py-3 text-xs font-sans font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-sm active:scale-95 self-start sm:self-auto flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating Drafts…
            </>
          ) : (
            '⚡ Generate Draft POs Now'
          )}
        </button>
      </div>

      {/* Low Stock Alerts Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-sans font-extrabold uppercase tracking-tight text-[#10100F]">
              Depleted Inventory Alerts ({lowStock.length})
            </h2>
            <p className="text-xs text-[#10100F]/50 font-sans">Variants that have dipped below safety reorder threshold</p>
          </div>
          {lowStock.length > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 px-3.5 py-1 font-sans text-xs font-bold text-red-700">
              ⚠ Action Required
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-[#e5ded2] bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-[11px] font-sans font-bold uppercase tracking-wider text-[#10100F]/70 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-6">Product Silhouette</th>
                <th className="py-3.5 px-6">Variant SKU</th>
                <th className="py-3.5 px-6">Current In-Stock</th>
                <th className="py-3.5 px-6 text-right">Reorder Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded2]">
              {loading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 w-40 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6"><div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6"><div className="h-5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-3.5 w-28 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                  </tr>
                ))
              ) : lowStock.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-sans font-bold text-emerald-800">
                      ✓ All product variations are healthy and above minimum safety thresholds
                    </div>
                  </td>
                </tr>
              ) : (
                lowStock.map((v) => (
                  <tr key={v.variantId} className="hover:bg-[#f3f3f1]/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-sm sm:text-base text-[#10100F] font-sans">
                      {v.productName}
                    </td>
                    <td className="py-4 px-6 font-sans text-xs font-semibold text-[#10100F]/70">
                      {v.sku || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-0.5 font-sans text-xs font-bold text-red-700">
                        ● {v.stockQty} units remaining
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-sans text-xs text-[#10100F]/60">
                      ≤ {v.lowStockThreshold} units trigger
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Purchase Orders Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-sans font-extrabold uppercase tracking-tight text-[#10100F]">
              Purchase Orders ({drafts.length})
            </h2>
            <p className="text-xs text-[#10100F]/50 font-sans">Restock procurement batches dispatched to manufacturing partners</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5ded2] bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-[11px] font-sans font-bold uppercase tracking-wider text-[#10100F]/70 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-6">PO Reference</th>
                <th className="py-3.5 px-6">Manufacturing Partner</th>
                <th className="py-3.5 px-6">Created On</th>
                <th className="py-3.5 px-6">Lifecycle Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded2]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 w-20 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6"><div className="h-4 w-36 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6"><div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6"><div className="h-5 w-20 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-7 w-28 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                  </tr>
                ))
              ) : drafts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-[#10100F]/50 font-sans">
                    No active purchase orders. Click &ldquo;Generate Draft POs Now&rdquo; to analyze low inventory and assemble batches.
                  </td>
                </tr>
              ) : (
                drafts.map((po) => (
                  <tr key={po.id} className="hover:bg-[#f3f3f1]/40 transition-colors">
                    <td className="py-4 px-6 font-sans font-bold text-sm text-[#10100F]">
                      #{po.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 font-semibold text-sm sm:text-base text-[#10100F] font-sans">
                      {po.supplierName}
                    </td>
                    <td className="py-4 px-6 font-sans text-xs text-[#10100F]/60">
                      {new Date(po.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      {po.status === 'DRAFT' && (
                        <button
                          disabled={markingId === po.id}
                          onClick={() => markSent(po.id)}
                          className="rounded-full border border-[#e5ded2] bg-white px-4 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] disabled:opacity-50 transition-all shadow-xs active:scale-95"
                        >
                          {markingId === po.id ? 'Sending…' : 'Mark Sent to Vendor →'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
