'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { MaintenanceStatus } from '@/lib/types';

export default function AdminMaintenanceSettingsPage() {
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<MaintenanceStatus>('/api/admin/settings/maintenance', { token: auth.token })
      .then((res) => {
        setMaintenance(res);
        setMaintenanceMessage(res.message || '');
      })
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminAuth();
          router.push('/admin/login');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(enabled: boolean) {
    setSaving(true);
    setError(null);
    const auth = getAdminAuth();
    try {
      const res = await apiFetch<MaintenanceStatus>('/api/admin/settings/maintenance', {
        method: 'PUT',
        token: auth?.token,
        body: { enabled, message: maintenanceMessage.trim() || null }
      });
      setMaintenance(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update maintenance mode.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="border-b border-[#e5ded2] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
          Settings
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
          Maintenance
        </h1>
        <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl">
          Take the storefront fully offline for customers -- browsing, cart and checkout all show a
          "back shortly" page, and the API rejects those requests too. The admin dashboard stays
          accessible the whole time so you can turn it back off.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 text-center text-sm text-[#10100F]/60 shadow-2xs">
          Loading…
        </div>
      ) : (
        maintenance && (
          <div
            className={`rounded-xl border p-6 sm:p-8 space-y-5 ${
              maintenance.enabled ? 'border-rose-300 bg-rose-50/60' : 'border-[#e5ded2] bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex h-2 w-2 rounded-full ${maintenance.enabled ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#10100F]">
                {maintenance.enabled ? 'Store is OFFLINE' : 'Store is live'}
              </h3>
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="block text-[13px] font-medium text-[#10100F]/55">
                Message shown to customers (optional)
              </label>
              <input
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We're currently performing some maintenance on the store..."
                className="w-full rounded-lg border border-[#e5ded2] bg-white px-3 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/35 focus:outline-none focus:border-[#10100F]"
              />
            </div>

            {error && <p className="text-xs font-medium text-rose-700">{error}</p>}

            <button
              onClick={() => toggle(!maintenance.enabled)}
              disabled={saving}
              className={`rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${
                maintenance.enabled
                  ? 'bg-[#10100F] text-white hover:bg-neutral-800'
                  : 'bg-rose-700 text-white hover:bg-rose-800'
              }`}
            >
              {saving ? 'Saving…' : maintenance.enabled ? 'Turn Off -- Go Live' : 'Turn On Maintenance Mode'}
            </button>
          </div>
        )
      )}
    </div>
  );
}
