'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { setAdminAuth } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = bootstrapMode ? '/api/admin/auth/bootstrap' : '/api/admin/auth/login';
      const auth = await apiFetch<AuthResponse>(path, { method: 'POST', body: { email, password } });
      setAdminAuth(auth);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong -- check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10 transition-colors">
          <span className="font-heading text-lg font-black tracking-[0.2em] text-white">
            GRAPHITES
          </span>
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-white/50">
            Studio Operations
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-white/10 bg-[#171716] p-8 shadow-2xl">
        <div className="mb-6">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-white/50 block">
            Authentication
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight text-white mt-1 font-sans">
            {bootstrapMode ? 'Create First Admin' : 'Sign In'}
          </h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-white/60 mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-white focus:outline-none transition-colors font-sans"
              placeholder="admin@jess.shop"
            />
          </div>

          <div>
            <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-white/60 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={bootstrapMode ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-white focus:outline-none transition-colors font-sans"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-400 font-sans font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white text-[#10100F] py-3 text-xs font-sans font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 shadow-sm"
          >
            {loading ? 'Authenticating…' : bootstrapMode ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <button
            onClick={() => setBootstrapMode((v) => !v)}
            className="text-[11px] font-sans font-medium text-white/50 hover:text-white transition-colors"
          >
            {bootstrapMode
              ? 'Already have an account? Sign in'
              : 'First time setup? Create first admin'}
          </button>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-sans text-white/50 hover:text-white hover:bg-white/5 transition-colors">
          ← Back to Storefront
        </Link>
      </div>
    </div>
  );
}
