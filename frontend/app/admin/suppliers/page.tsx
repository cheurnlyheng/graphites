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

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<SupplierResponse[]>('/api/admin/suppliers', { token: auth.token })
      .then(setSuppliers)
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

  async function create(e: FormEvent) {
    e.preventDefault();
    const auth = getAdminAuth();
    await apiFetch('/api/admin/suppliers', { method: 'POST', token: auth?.token, body: { name, contactEmail: email } });
    setName('');
    setEmail('');
    load();
  }

  return (
    <div>
      <h1 className="page-heading mb-6">Suppliers</h1>
      <form onSubmit={create} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1">
          <label className="label">Supplier name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div className="flex-1">
          <label className="label">Contact email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>
      <div className="card divide-y divide-line">
        {suppliers.map((s) => (
          <div key={s.id} className="p-4 text-sm">
            <p className="font-medium text-ink">{s.name}</p>
            <p className="text-ink/50">{s.contactEmail}</p>
          </div>
        ))}
        {suppliers.length === 0 && <p className="p-6 text-center text-ink/50">No suppliers yet.</p>}
      </div>
      <p className="mt-4 text-xs text-ink/40">
        To link a supplier to a product variant for auto-restock alerts, call the admin API endpoint POST
        /api/admin/suppliers/variants/&#123;variantId&#125;/link — a dedicated linking UI can be added once suppliers are in regular use.
      </p>
    </div>
  );
}
