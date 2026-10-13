'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { apiFetch, ApiError } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { TwoFactorStatus, TwoFactorSetup } from '@/lib/types';

export default function AdminSecuritySettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Mid-setup state -- present only between clicking "Set Up" and either confirming or cancelling.
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Disable flow -- needs the current password, so it's its own small reveal rather than a single click.
  const [disabling, setDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<TwoFactorStatus>('/api/admin/2fa/status', { token: auth.token })
      .then(setStatus)
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

  async function startSetup() {
    setSetupError(null);
    setWorking(true);
    const auth = getAdminAuth();
    try {
      const res = await apiFetch<TwoFactorSetup>('/api/admin/2fa/setup', { method: 'POST', token: auth?.token });
      setSetup(res);
      setQrDataUrl(await QRCode.toDataURL(res.uri));
    } catch (err) {
      setSetupError(err instanceof ApiError ? err.message : 'Could not start two-factor setup.');
    } finally {
      setWorking(false);
    }
  }

  async function confirmSetup() {
    setSetupError(null);
    setWorking(true);
    const auth = getAdminAuth();
    try {
      await apiFetch('/api/admin/2fa/confirm', { method: 'POST', token: auth?.token, body: { code: confirmCode } });
      setSetup(null);
      setQrDataUrl(null);
      setConfirmCode('');
      load();
    } catch (err) {
      setSetupError(err instanceof ApiError ? err.message : 'Could not confirm two-factor setup.');
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setDisableError(null);
    setWorking(true);
    const auth = getAdminAuth();
    try {
      await apiFetch('/api/admin/2fa/disable', { method: 'POST', token: auth?.token, body: { password: disablePassword } });
      setDisabling(false);
      setDisablePassword('');
      load();
    } catch (err) {
      setDisableError(err instanceof ApiError ? err.message : 'Could not disable two-factor authentication.');
    } finally {
      setWorking(false);
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
          Security
        </h1>
        <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl">
          Two-factor authentication requires a 6-digit code from an authenticator app (Google
          Authenticator, Authy, 1Password, etc.) in addition to your password on every login.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#e5ded2] bg-white p-12 text-center text-sm text-[#10100F]/60 shadow-2xs">
          Loading…
        </div>
      ) : setup ? (
        /* Mid-setup: show the QR + manual secret + confirmation code input */
        <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 space-y-5 max-w-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#10100F]">
            Scan this QR code
          </h3>
          <p className="text-xs text-[#10100F]/60">
            Open your authenticator app and scan the code below, or enter the key manually.
          </p>
          {qrDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URL, not a managed asset */
            <img src={qrDataUrl} alt="Two-factor authentication QR code" className="mx-auto h-48 w-48" />
          )}
          <div className="rounded-lg bg-[#f3f3f1] border border-[#e5ded2] p-3 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#10100F]/50 mb-1">
              Manual entry key
            </span>
            <span className="font-mono text-sm tracking-wider text-[#10100F] break-all">{setup.secret}</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[#10100F]/55">
              Enter the 6-digit code it shows now, to confirm
            </label>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              inputMode="numeric"
              placeholder="000000"
              className="w-full rounded-lg border border-[#e3e3e3] bg-white p-3 text-center text-lg tracking-[0.4em] text-[#10100F] focus:outline-none focus:border-[#10100F]"
            />
          </div>

          {setupError && <p className="text-xs font-medium text-rose-700">{setupError}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={confirmSetup}
              disabled={working || confirmCode.length !== 6}
              className="rounded-full bg-[#10100F] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-95"
            >
              {working ? 'Confirming…' : 'Confirm & Enable'}
            </button>
            <button
              onClick={() => { setSetup(null); setQrDataUrl(null); setConfirmCode(''); setSetupError(null); }}
              className="text-xs uppercase text-[#10100F]/40 hover:text-[#10100F]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Steady state: show current status + the one available action */
        status && (
          <div
            className={`rounded-xl border p-6 sm:p-8 space-y-5 max-w-md ${
              status.enabled ? 'border-emerald-300 bg-emerald-50/40' : 'border-[#e5ded2] bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex h-2 w-2 rounded-full ${status.enabled ? 'bg-emerald-500' : 'bg-[#10100F]/30'}`} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#10100F]">
                Two-factor authentication is {status.enabled ? 'ON' : 'OFF'}
              </h3>
            </div>

            {status.enabled ? (
              disabling ? (
                <div className="space-y-3">
                  <label className="block text-[13px] font-medium text-[#10100F]/55">
                    Confirm your password to disable
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full rounded-lg border border-[#e3e3e3] bg-white p-3 text-sm text-[#10100F] focus:outline-none focus:border-[#10100F]"
                  />
                  {disableError && <p className="text-xs font-medium text-rose-700">{disableError}</p>}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={disable}
                      disabled={working || !disablePassword}
                      className="rounded-full bg-rose-700 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-rose-800 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {working ? 'Disabling…' : 'Confirm Disable'}
                    </button>
                    <button
                      onClick={() => { setDisabling(false); setDisablePassword(''); setDisableError(null); }}
                      className="text-xs uppercase text-[#10100F]/40 hover:text-[#10100F]"
                    >
                      Never mind
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDisabling(true)}
                  className="rounded-full border border-rose-200 text-rose-700 bg-rose-50/50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-rose-100/60 transition-all active:scale-95"
                >
                  Disable Two-Factor Authentication
                </button>
              )
            ) : (
              <>
                <p className="text-xs text-[#10100F]/60">
                  Not enabled yet -- your account only needs a password to sign in.
                </p>
                {setupError && <p className="text-xs font-medium text-rose-700">{setupError}</p>}
                <button
                  onClick={startSetup}
                  disabled={working}
                  className="rounded-full bg-[#10100F] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-95"
                >
                  {working ? 'Starting…' : 'Set Up Two-Factor Authentication'}
                </button>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
