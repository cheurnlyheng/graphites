'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setAdminAuth } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const path = bootstrapMode ? '/api/admin/auth/bootstrap' : '/api/admin/auth/login';
      const auth = await apiFetch<AuthResponse>(path, { method: 'POST', body: { email, password } });
      setAdminAuth(auth);
      router.push('/admin');
    } catch {
      setError(bootstrapMode ? 'Could not create the first admin (one may already exist).' : 'Invalid email or password.');
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white p-8 shadow-card">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Admin</p>
      <h1 className="section-heading mb-6">{bootstrapMode ? 'Create the first admin account' : 'Log in'}</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={bootstrapMode ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full">
          {bootstrapMode ? 'Create admin account' : 'Log in'}
        </button>
      </form>
      <button onClick={() => setBootstrapMode((v) => !v)} className="btn-ghost mt-4 w-full justify-center">
        {bootstrapMode ? 'Already have an admin account? Log in' : 'First time setup? Create the first admin account'}
      </button>
    </div>
  );
}
