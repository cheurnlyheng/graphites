'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import type { PageResponse, ReturnResponse } from '@/lib/types';

export default function AdminReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'REQUESTED' | 'APPROVED' | 'RESOLVED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<PageResponse<ReturnResponse>>('/api/admin/returns?size=100', { token: auth.token })
      .then((p) => setReturns(p.content))
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

  async function act(id: string, action: 'approve' | 'reject') {
    setActionLoading(id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${id}/${action}`, { method: 'POST', token: auth?.token });
      load();
    } finally {
      setActionLoading(null);
    }
  }

  async function resolve(id: string, restock: boolean) {
    setActionLoading(id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${id}/resolve`, { method: 'POST', token: auth?.token, body: { restock } });
      load();
    } finally {
      setActionLoading(null);
    }
  }

  const requestedCount = returns.filter((r) => r.status === 'REQUESTED').length;
  const approvedCount = returns.filter((r) => r.status === 'APPROVED').length;

  const filteredReturns = returns.filter((r) => {
    if (filter === 'REQUESTED') return r.status === 'REQUESTED';
    if (filter === 'APPROVED') return r.status === 'APPROVED';
    if (filter === 'RESOLVED') return r.status !== 'REQUESTED' && r.status !== 'APPROVED';
    return true;
  });

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Customer Claims &amp; Reverse Logistics
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              Returns &amp; Exchanges
            </h1>
            <span className="text-sm font-semibold text-[#10100F]/50">({returns.length} total)</span>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl">
            Inspect customer return requests, approve shipments, verify returned garment condition, and issue inventory restocks and refunds.
          </p>
        </div>

        {requestedCount > 0 && (
          <div className="flex items-center gap-2.5 rounded-full border border-amber-300 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold">{requestedCount} awaiting review</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ded2]/60 pb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'ALL'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          All Returns ({returns.length})
        </button>
        <button
          onClick={() => setFilter('REQUESTED')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            filter === 'REQUESTED'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          Needs Approval
          {requestedCount > 0 && (
            <span className={`rounded-full px-2 py-0.2 text-[10px] ${filter === 'REQUESTED' ? 'bg-amber-400 text-black font-black' : 'bg-amber-100 text-amber-900 font-bold'}`}>
              {requestedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('APPROVED')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            filter === 'APPROVED'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          In Transit / Approved ({approvedCount})
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'RESOLVED'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          Completed &amp; Rejected
        </button>
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-[#e5ded2] bg-white p-12 text-center text-sm text-[#10100F]/60 shadow-2xs">
            Loading customer return requests…
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e5ded2] bg-white p-16 text-center shadow-2xs">
            <p className="text-sm font-bold uppercase tracking-wider text-[#10100F]">No return claims match current filter</p>
            <p className="text-xs text-[#10100F]/50 mt-1">When customers submit return requests through their portal, they will show up here for authorization.</p>
          </div>
        ) : (
          filteredReturns.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-7 space-y-5 shadow-2xs">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ded2] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#10100F]">
                      Return #{r.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-[#10100F]/30">•</span>
                    <Link
                      href={`/admin/orders/${r.orderId}`}
                      className="text-xs font-semibold text-[#10100F]/70 hover:text-[#10100F] underline hover:no-underline"
                    >
                      Order #{r.orderId.slice(0, 8)} ↗
                    </Link>
                  </div>
                  <p className="text-xs text-[#10100F]/50">
                    Submitted on {new Date(r.requestedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {/* Customer Reason Box */}
              {r.reason && (
                <div className="rounded-xl bg-[#f3f3f1] border border-[#e5ded2] p-4 text-xs sm:text-sm text-[#10100F]/80 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#10100F]/50 block">
                    Customer Explanation
                  </span>
                  <p className="italic leading-relaxed font-serif text-[#10100F]">
                    &ldquo;{r.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Garments Breakdown */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70 block mb-2">
                  Claimed Items ({r.items.length})
                </span>
                <div className="rounded-xl border border-[#e5ded2] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] font-bold uppercase tracking-wider text-[#10100F]/60">
                      <tr>
                        <th className="py-2.5 px-4">Garment</th>
                        <th className="py-2.5 px-4 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5ded2]">
                      {r.items.map((i) => (
                        <tr key={i.id} className="hover:bg-[#f3f3f1]/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-sm text-[#10100F]">
                            {i.productName}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#10100F]">
                            {i.quantity} unit{i.quantity === 1 ? '' : 's'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {r.status === 'REQUESTED' && (
                  <>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => act(r.id, 'approve')}
                      className="rounded-full bg-[#10100F] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      {actionLoading === r.id ? 'Processing…' : 'Approve Return Claim'}
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => act(r.id, 'reject')}
                      className="rounded-full border border-red-200 text-red-700 bg-red-50/50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      Reject Claim
                    </button>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => resolve(r.id, true)}
                      className="rounded-full bg-[#10100F] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      {actionLoading === r.id ? 'Processing…' : 'Received In Warehouse — Restock & Refund'}
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => resolve(r.id, false)}
                      className="rounded-full border border-[#e5ded2] bg-white text-[#10100F] px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#f3f3f1] disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      Received Damaged — Refund Only (No Restock)
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
