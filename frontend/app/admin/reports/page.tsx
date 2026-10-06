'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { toISODate, daysAgo, REPORT_PRESETS as PRESETS } from '@/lib/date-ranges';
import type { ReportSummaryResponse } from '@/lib/types';

export default function AdminReportsPage() {
  const router = useRouter();
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [from, setFrom] = useState(() => toISODate(daysAgo(29)));
  const [to, setTo] = useState(() => toISODate(daysAgo(0)));
  const [report, setReport] = useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch<ReportSummaryResponse>(`/api/admin/reports/summary?from=${from}&to=${to}`, { token: auth.token })
      .then(setReport)
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
          return;
        }
        setError('Could not load the report.');
      })
      .finally(() => setLoading(false));
  }, [from, to, router]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setActivePreset(preset.label);
    setFrom(toISODate(preset.from()));
    setTo(toISODate(preset.to()));
  }

  const maxDaily = useMemo(
    () => Math.max(1, ...(report?.revenueByDay.map((d) => d.revenue) ?? [0])),
    [report]
  );

  return (
    <div className="w-full max-w-[1700px] space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Business Insights
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
            Reports
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                activePreset === preset.label
                  ? 'bg-[#10100F] text-white border-[#10100F]'
                  : 'bg-white text-[#10100F]/70 border-[#e5ded2] hover:border-[#10100F]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#10100F]/60">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setActivePreset('');
                setFrom(e.target.value);
              }}
              className="rounded-full border border-[#e5ded2] bg-white px-3 py-1.5 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#10100F]/60">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={toISODate(new Date())}
              onChange={(e) => {
                setActivePreset('');
                setTo(e.target.value);
              }}
              className="rounded-full border border-[#e5ded2] bg-white px-3 py-1.5 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">Gross Earnings</span>
          <p className="mt-3 text-4xl font-extrabold text-[#10100F] tracking-tight">
            {loading ? '—' : `$${(report?.totalRevenue ?? 0).toFixed(2)}`}
          </p>
          <p className="text-xs text-[#10100F]/55 mt-2">What customers paid, before costs</p>
        </div>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">Orders</span>
          <p className="mt-3 text-4xl font-extrabold text-[#10100F] tracking-tight">
            {loading ? '—' : (report?.orderCount ?? 0)}
          </p>
          <p className="text-xs text-[#10100F]/55 mt-2">Orders that were paid in this window</p>
        </div>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">Average Order Value</span>
          <p className="mt-3 text-4xl font-extrabold text-[#10100F] tracking-tight">
            {loading ? '—' : `$${(report?.averageOrderValue ?? 0).toFixed(2)}`}
          </p>
          <p className="text-xs text-[#10100F]/55 mt-2">Gross earnings ÷ order count</p>
        </div>
      </div>

      {/* Costs & net profit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">Spent on Labels</span>
          <p className="mt-3 text-4xl font-extrabold text-rose-700 tracking-tight">
            {loading ? '—' : `-$${(report?.labelCost ?? 0).toFixed(2)}`}
          </p>
          <p className="text-xs text-[#10100F]/55 mt-2">Shippo label purchases in range</p>
        </div>
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60">Est. Stripe Fees</span>
          <p className="mt-3 text-4xl font-extrabold text-rose-700 tracking-tight">
            {loading ? '—' : `-$${(report?.estimatedStripeFees ?? 0).toFixed(2)}`}
          </p>
          <p className="text-xs text-[#10100F]/55 mt-2">Estimated at 2.9% + $0.30/order -- not the exact Stripe number</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Net Profit</span>
          <p className="mt-3 text-4xl font-extrabold text-emerald-900 tracking-tight">
            {loading ? '—' : `$${(report?.netProfit ?? 0).toFixed(2)}`}
          </p>
          <p className="text-xs text-emerald-800/70 mt-2">Gross earnings minus labels &amp; est. Stripe fees</p>
        </div>
      </div>

      {/* Revenue by day */}
      <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 mb-5">Earnings by Day</h2>
        {loading ? (
          <div className="h-40 animate-pulse rounded-lg bg-[#f3f3f1]" />
        ) : !report || report.revenueByDay.length === 0 ? (
          <p className="text-sm text-[#10100F]/50 py-10 text-center">No paid orders in this range.</p>
        ) : (
          <div className="flex items-end gap-1 h-48 overflow-x-auto pb-1">
            {report.revenueByDay.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5 shrink-0 group" style={{ minWidth: 28 }}>
                <span className="text-[10px] font-bold text-[#10100F]/0 group-hover:text-[#10100F]/70 transition-colors whitespace-nowrap">
                  ${d.revenue.toFixed(0)}
                </span>
                <div
                  className="w-5 rounded-t bg-[#10100F]/80 group-hover:bg-[#10100F] transition-colors"
                  style={{ height: `${Math.max(4, (d.revenue / maxDaily) * 140)}px` }}
                  title={`${d.date}: $${d.revenue.toFixed(2)} across ${d.orderCount} order(s)`}
                />
                <span className="text-[9px] text-[#10100F]/40 [writing-mode:vertical-rl] rotate-180 h-10">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top products */}
      <div className="rounded-xl border border-[#e5ded2] bg-white overflow-hidden shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 px-6 pt-6 mb-2">Top Products</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#e5ded2] text-xs font-bold uppercase tracking-wider text-[#10100F]/60">
            <tr>
              <th className="py-3 px-6">Product</th>
              <th className="py-3 px-6">Units Sold</th>
              <th className="py-3 px-6">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5ded2]/80">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-6"><div className="h-4 w-32 rounded-full bg-[#f3f3f1]" /></td>
                  <td className="py-3 px-6"><div className="h-4 w-10 rounded-full bg-[#f3f3f1]" /></td>
                  <td className="py-3 px-6"><div className="h-4 w-16 rounded-full bg-[#f3f3f1]" /></td>
                </tr>
              ))
            ) : !report || report.topProducts.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-[#10100F]/50">
                  No sales in this range yet.
                </td>
              </tr>
            ) : (
              report.topProducts.map((p) => (
                <tr key={p.productName} className="hover:bg-[#f3f3f1]/50 transition-colors">
                  <td className="py-3 px-6 font-bold text-[#10100F]">{p.productName}</td>
                  <td className="py-3 px-6 text-[#10100F]/70">{p.quantitySold}</td>
                  <td className="py-3 px-6 font-bold text-[#10100F]">${p.revenue.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
