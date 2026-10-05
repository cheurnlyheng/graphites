'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { SupplierResponse } from '@/lib/types';

export default function AdminSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<SupplierResponse[]>('/api/admin/suppliers', { token: auth.token })
      .then(setSuppliers)
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

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const auth = getAdminAuth();
    try {
      await apiFetch('/api/admin/suppliers', {
        method: 'POST',
        token: auth?.token,
        body: { name, contactEmail: email }
      });
      setName('');
      setEmail('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactEmail && s.contactEmail.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-8">
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]/60 block mb-1.5">
            Supply Chain &amp; Manufacturing
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase font-sans">
              Suppliers Directory
            </h1>
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/50">({suppliers.length} vendors)</span>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl font-sans">
            Textile mills, waterproof outerwear manufacturers, and component suppliers linked to automated restock purchase orders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Register Supplier Card (Left Column on LG) */}
        <div className="rounded-2xl border border-[#e5ded2] bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-[#e5ded2] pb-4">
            <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-[#10100F]">
              Register New Vendor
            </h2>
            <p className="text-xs text-[#10100F]/50 mt-1 font-sans">Add a factory partner to receive purchase orders.</p>
          </div>

          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                Vendor / Factory Name *
              </label>
              <input
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nordic Weatherproof Mills"
                className="w-full rounded-full border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                PO Contact Email
              </label>
              <input
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="production@mill.com"
                className="w-full rounded-full border border-[#e5ded2] bg-white px-4 py-2.5 text-sm font-sans text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all"
              />
              <p className="mt-1 text-[11px] font-sans text-[#10100F]/50">Restock purchase order notices sent here</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#10100F] py-3 text-xs font-sans font-bold uppercase tracking-wider text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting ? 'Registering…' : '+ Add Supplier'}
            </button>
          </form>
        </div>

        {/* Suppliers Directory Table (2 Cols on LG) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor name or email…"
                className="w-full rounded-full border border-[#e5ded2] bg-white px-4 py-2 text-xs text-[#10100F] placeholder:text-[#10100F]/40 focus:border-[#10100F] focus:outline-none font-sans"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#10100F]/40 hover:text-[#10100F]"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#10100F]/50">
              Showing {filteredSuppliers.length} of {suppliers.length}
            </span>
          </div>

          <div className="rounded-2xl border border-[#e5ded2] bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-[11px] font-sans font-bold uppercase tracking-wider text-[#10100F]/70 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="py-3.5 px-6">Supplier Organization</th>
                  <th className="py-3.5 px-6">Direct Email</th>
                  <th className="py-3.5 px-6 text-right">Vendor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded2]">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#f3f3f1]" />
                          <div className="h-4 w-36 rounded-full bg-[#f3f3f1]" />
                        </div>
                      </td>
                      <td className="py-4 px-6"><div className="h-4 w-40 rounded-full bg-[#f3f3f1]" /></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 w-16 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-16 text-center text-sm font-sans text-[#10100F]/60">
                      {search ? 'No suppliers match your search.' : 'No suppliers registered yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f3f3f1]/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10100F] text-xs font-bold text-white uppercase font-sans shadow-2xs">
                            {s.name.slice(0, 1)}
                          </div>
                          <span className="font-bold text-sm text-[#10100F] font-sans">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-sans text-sm text-[#10100F]/80">
                        {s.contactEmail ? (
                          <a href={`mailto:${s.contactEmail}`} className="hover:underline hover:text-[#10100F]">
                            {s.contactEmail}
                          </a>
                        ) : (
                          <span className="text-[#10100F]/30 font-sans">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-sans text-xs font-semibold text-[#10100F]/40 uppercase tracking-wider">
                        #{s.id.slice(0, 8)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
