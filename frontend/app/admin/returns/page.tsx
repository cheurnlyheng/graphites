'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { PageResponse, ReturnResponse } from '@/lib/types';

export default function AdminReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnResponse[]>([]);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<PageResponse<ReturnResponse>>('/api/admin/returns?size=100', { token: auth.token })
      .then((p) => setReturns(p.content))
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: 'approve' | 'reject') {
    const auth = getAdminAuth();
    await apiFetch(`/api/admin/returns/${id}/${action}`, { method: 'POST', token: auth?.token });
    load();
  }

  async function resolve(id: string, restock: boolean) {
    const auth = getAdminAuth();
    await apiFetch(`/api/admin/returns/${id}/resolve`, { method: 'POST', token: auth?.token, body: { restock } });
    load();
  }

  return (
    <div>
      <h1 className="page-heading mb-6">Returns</h1>
      <div className="space-y-3">
        {returns.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">
                Return #{r.id.slice(0, 8)} — order #{r.orderId.slice(0, 8)}
              </p>
              <StatusBadge status={r.status} />
            </div>
            {r.reason && <p className="mt-1.5 text-sm text-ink/60">Reason: {r.reason}</p>}
            <ul className="mt-2 space-y-0.5 text-sm text-ink/70">
              {r.items.map((i) => (
                <li key={i.id}>
                  {i.productName} × {i.quantity}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status === 'REQUESTED' && (
                <>
                  <button onClick={() => act(r.id, 'approve')} className="btn-secondary py-1.5 text-xs">
                    Approve
                  </button>
                  <button onClick={() => act(r.id, 'reject')} className="btn-danger py-1.5 text-xs">
                    Reject
                  </button>
                </>
              )}
              {r.status === 'APPROVED' && (
                <>
                  <button onClick={() => resolve(r.id, true)} className="btn-secondary py-1.5 text-xs">
                    Received — restock &amp; refund
                  </button>
                  <button onClick={() => resolve(r.id, false)} className="btn-secondary py-1.5 text-xs">
                    Received — refund only
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {returns.length === 0 && <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink/50">No returns.</p>}
      </div>
    </div>
  );
}
