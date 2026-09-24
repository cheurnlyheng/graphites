'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { LowStockVariant, PurchaseOrderResponse } from '@/lib/types';

export default function AdminPurchaseOrdersPage() {
  const router = useRouter();
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([]);
  const [drafts, setDrafts] = useState<PurchaseOrderResponse[]>([]);

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
    apiFetch<LowStockVariant[]>('/api/admin/purchase-orders/low-stock', { token: auth.token }).then(setLowStock).catch(onAuthError);
    apiFetch<PurchaseOrderResponse[]>('/api/admin/purchase-orders', { token: auth.token }).then(setDrafts).catch(onAuthError);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateNow() {
    const auth = getAdminAuth();
    await apiFetch('/api/admin/purchase-orders/generate-now', { method: 'POST', token: auth?.token });
    load();
  }

  async function markSent(id: string) {
    const auth = getAdminAuth();
    await apiFetch(`/api/admin/purchase-orders/${id}/mark-sent`, { method: 'POST', token: auth?.token });
    load();
  }

  return (
    <div>
      <h1 className="page-heading mb-6">Restock</h1>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="section-heading text-lg">Low stock</p>
          <button onClick={generateNow} className="btn-secondary py-1.5 text-xs">
            Generate draft POs now
          </button>
        </div>
        <div className="card divide-y divide-line">
          {lowStock.map((v) => (
            <div key={v.variantId} className="flex justify-between p-3 text-sm">
              <span className="text-ink">
                {v.productName} ({v.sku})
              </span>
              <span className="font-medium text-red-600">
                {v.stockQty} left <span className="font-normal text-ink/40">(threshold {v.lowStockThreshold})</span>
              </span>
            </div>
          ))}
          {lowStock.length === 0 && <p className="p-4 text-center text-ink/50">Nothing low on stock right now.</p>}
        </div>
      </section>

      <section>
        <p className="section-heading mb-3 text-lg">Draft purchase orders</p>
        <div className="space-y-3">
          {drafts.map((po) => (
            <div key={po.id} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{po.supplierName}</p>
                <button onClick={() => markSent(po.id)} className="btn-secondary py-1.5 text-xs">
                  Mark sent
                </button>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-ink/70">
                {po.items.map((i) => (
                  <li key={i.id}>
                    {i.sku} × {i.quantity}
                    {i.unitCost ? ` @ $${i.unitCost}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {drafts.length === 0 && (
            <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink/50">
              No draft purchase orders. Link suppliers to variants so low-stock items can generate one.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
