'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, mediaUrl, ApiError } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import type { PageResponse, ReturnResponse, ShippingRateOption } from '@/lib/types';

export default function AdminReturnsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [returns, setReturns] = useState<ReturnResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'RESOLVED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  // Rate-shopping state for buying a return label -- keyed by return id, since several cards can be
  // mid-flow (fetching rates, or showing a rate list) at once in this list page.
  const [ratesById, setRatesById] = useState<Record<string, ShippingRateOption[]>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

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

  function setMsg(id: string, msg: string) {
    setStatusById((s) => ({ ...s, [id]: msg }));
  }

  async function approve(id: string, shopFault: boolean) {
    setActionLoading(id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${id}/approve`, { method: 'POST', token: auth?.token, body: { shopFault } });
      load();
    } catch (err) {
      setMsg(id, err instanceof ApiError ? err.message : 'Could not approve this return.');
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmReject(id: string) {
    setActionLoading(id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${id}/reject`, { method: 'POST', token: auth?.token, body: { note: rejectNote.trim() || null } });
      setRejectingId(null);
      setRejectNote('');
      load();
    } catch (err) {
      setMsg(id, err instanceof ApiError ? err.message : 'Could not reject this return.');
    } finally {
      setActionLoading(null);
    }
  }

  async function fetchReturnRates(id: string) {
    setActionLoading(id);
    const auth = getAdminAuth();
    try {
      const res = await apiFetch<{ rates: ShippingRateOption[] }>(`/api/admin/returns/${id}/return-rates`, { token: auth?.token });
      setRatesById((r) => ({ ...r, [id]: res.rates }));
      if (res.rates.length === 0) setMsg(id, 'No return shipping rates are available for this address.');
    } catch (err) {
      setMsg(id, err instanceof ApiError ? err.message : 'Could not fetch return shipping rates.');
    } finally {
      setActionLoading(null);
    }
  }

  async function buyReturnLabel(id: string, rateObjectId: string, provider: string, amount: string) {
    setActionLoading(id);
    setMsg(id, 'Buying return label…');
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${id}/return-label`, {
        method: 'POST',
        token: auth?.token,
        body: { rateObjectId, carrier: provider, amount, returnLabel: true }
      });
      setRatesById((r) => ({ ...r, [id]: [] }));
      setMsg(id, 'Return label bought and emailed to the customer.');
      load();
    } catch (err) {
      setMsg(id, err instanceof ApiError ? err.message : 'Could not buy the return label.');
    } finally {
      setActionLoading(null);
    }
  }

  async function markReceived(r: ReturnResponse) {
    if (!r.returnLabelUrl) {
      const proceed = await confirm({
        title: 'No return label was ever sent',
        message: 'This return was never given a shipping label, so the customer never got an email with tracking info or drop-off instructions. Only continue if they shipped the item back on their own.',
        confirmLabel: 'Mark as Received Anyway',
        danger: true
      });
      if (!proceed) return;
    }
    setActionLoading(r.id);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/returns/${r.id}/received`, { method: 'POST', token: auth?.token });
      load();
    } catch (err) {
      setMsg(r.id, err instanceof ApiError ? err.message : 'Could not mark this return as received.');
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
    } catch (err) {
      setMsg(id, err instanceof ApiError ? err.message : 'Could not refund this return.');
    } finally {
      setActionLoading(null);
    }
  }

  const requestedCount = returns.filter((r) => r.status === 'REQUESTED').length;
  const approvedCount = returns.filter((r) => r.status === 'APPROVED').length;
  const receivedCount = returns.filter((r) => r.status === 'RECEIVED').length;

  const filteredReturns = returns.filter((r) => {
    if (filter === 'REQUESTED') return r.status === 'REQUESTED';
    if (filter === 'APPROVED') return r.status === 'APPROVED';
    if (filter === 'RECEIVED') return r.status === 'RECEIVED';
    if (filter === 'RESOLVED') return r.status === 'REFUNDED' || r.status === 'REJECTED';
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
            Approve or reject claims, buy return labels, and only refund once the item is back and inspected.
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
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'APPROVED'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          Approved — Awaiting Shipment ({approvedCount})
        </button>
        <button
          onClick={() => setFilter('RECEIVED')}
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'RECEIVED'
              ? 'bg-[#10100F] text-white shadow-2xs'
              : 'border border-[#e5ded2] bg-white text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F]'
          }`}
        >
          Received — Pending Inspection ({receivedCount})
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
                <div className="flex items-center gap-2">
                  {r.shopFault !== null && (
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      r.shopFault ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-orange-50 text-orange-800 border border-orange-200'
                    }`}>
                      {r.shopFault ? 'Shop Fault' : 'Customer Fault'}
                    </span>
                  )}
                  <StatusBadge status={r.status} />
                </div>
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

              {/* Condition Proof Photos -- check these before approving a refund */}
              {r.photoUrls.length > 0 && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70 block mb-2">
                    Condition Photos ({r.photoUrls.length})
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {r.photoUrls.map((url) => (
                      <a
                        key={url}
                        href={mediaUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[#e5ded2] hover:border-[#10100F] transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- customer-submitted proof photo, not a managed product image */}
                        <img src={mediaUrl(url)} alt="Return condition proof" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
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

              {/* Return Label Info, once bought */}
              {r.returnLabelUrl && (
                <div className="rounded-xl border border-[#e5ded2] bg-[#fbfbfb] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#10100F]/70">
                    <span className="font-bold text-[#10100F]">Return label bought</span>
                    {r.returnLabelCost != null && <span> · ${r.returnLabelCost.toFixed(2)}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={r.returnLabelUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs font-bold text-[#10100F] hover:underline">
                      View Label ↗
                    </a>
                    {r.returnTrackingUrl && (
                      <a href={r.returnTrackingUrl} target="_blank" rel="noopener noreferrer"
                         className="text-xs font-bold text-[#10100F] hover:underline">
                        Track Package ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {statusById[r.id] && (
                <p className="text-xs p-2.5 rounded-lg bg-[#f3f3f1] text-[#10100F]/80 font-medium">
                  {statusById[r.id]}
                </p>
              )}

              {/* Reject note box */}
              {rejectingId === r.id && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-900">Reject this return?</p>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Optional note to the customer explaining why…"
                    rows={2}
                    className="w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-[#10100F] focus:outline-none focus:border-rose-400"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => confirmReject(r.id)}
                      className="rounded-full bg-rose-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-rose-800 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      {actionLoading === r.id ? 'Processing…' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectNote(''); }}
                      className="text-xs uppercase text-[#10100F]/40 hover:text-[#10100F]"
                    >
                      Never mind
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {r.status === 'REQUESTED' && rejectingId !== r.id && (
                  <>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => approve(r.id, true)}
                      className="rounded-full bg-[#10100F] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      {actionLoading === r.id ? 'Processing…' : 'Approve — Shop’s Fault'}
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => approve(r.id, false)}
                      className="rounded-full border border-[#e5ded2] bg-white text-[#10100F] px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#f3f3f1] disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      Approve — Customer&apos;s Fault
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => setRejectingId(r.id)}
                      className="rounded-full border border-red-200 text-red-700 bg-red-50/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      Reject Claim
                    </button>
                  </>
                )}

                {r.status === 'APPROVED' && rejectingId !== r.id && (
                  <div className="w-full space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {!r.returnLabelUrl && (
                        <button
                          disabled={actionLoading === r.id}
                          onClick={() => fetchReturnRates(r.id)}
                          className="rounded-full bg-[#10100F] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                        >
                          {actionLoading === r.id ? 'Fetching…' : 'Get Return Shipping Rates'}
                        </button>
                      )}
                      <button
                        disabled={actionLoading === r.id}
                        onClick={() => markReceived(r)}
                        className="rounded-full border border-[#e5ded2] bg-white text-[#10100F] px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#f3f3f1] disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                      >
                        Mark as Received
                      </button>
                      <button
                        disabled={actionLoading === r.id}
                        onClick={() => setRejectingId(r.id)}
                        className="rounded-full border border-red-200 text-red-700 bg-red-50/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 transition-colors active:scale-95"
                      >
                        Reject Claim
                      </button>
                    </div>

                    {ratesById[r.id] && ratesById[r.id].length > 0 && (
                      <div className="space-y-2">
                        {ratesById[r.id].map((rate) => (
                          <div
                            key={rate.rateObjectId}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#e5ded2] hover:border-[#10100F] p-3 text-xs transition-colors"
                          >
                            <div>
                              <p className="font-bold text-[#10100F]">
                                {rate.provider} {rate.serviceLevel}
                              </p>
                              <p className="text-xs text-[#10100F]/60 mt-0.5">
                                ${rate.amount} {rate.currency} • {rate.estimatedDays ?? '?'} days
                              </p>
                            </div>
                            <button
                              onClick={() => buyReturnLabel(r.id, rate.rateObjectId, rate.provider, rate.amount)}
                              disabled={actionLoading === r.id}
                              className="rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shrink-0 active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Buy Label
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {r.status === 'RECEIVED' && rejectingId !== r.id && (
                  <>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => resolve(r.id, true)}
                      className="rounded-full bg-[#10100F] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      {actionLoading === r.id ? 'Processing…' : 'Confirm Refund & Restock'}
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => resolve(r.id, false)}
                      className="rounded-full border border-[#e5ded2] bg-white text-[#10100F] px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#f3f3f1] disabled:opacity-50 transition-colors shadow-2xs active:scale-95"
                    >
                      Confirm Refund — Damaged (No Restock)
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => setRejectingId(r.id)}
                      className="rounded-full border border-red-200 text-red-700 bg-red-50/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      Reject — Doesn&apos;t Match Claim
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
