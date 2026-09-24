import { ApiError } from '@/lib/api';

export interface StoredAuth {
  token: string;
  email: string;
}

const ADMIN_KEY = 'jess_shop_admin_auth';

function read(key: string): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function getAdminAuth(): StoredAuth | null {
  return read(ADMIN_KEY);
}

export function setAdminAuth(auth: StoredAuth) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(auth));
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_KEY);
}

/** A 401/403 from an admin API call means the stored token is missing/expired -- without this check,
 * every admin list page would otherwise render "no products"/"no orders"/etc. instead of prompting a
 * re-login, which looks identical to genuinely-empty data and is confusing to debug. */
export function isAdminAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}
