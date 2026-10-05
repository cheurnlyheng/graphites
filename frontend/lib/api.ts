export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

/** Admin-uploaded images are stored as "/uploads/..." and served by the backend, not by Next.js. */
export function mediaUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  cartToken?: string | null;
}

/** Thin fetch wrapper shared by every page/component that talks to the Spring Boot API. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.cartToken) headers['X-Cart-Token'] = options.cartToken;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store'
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // response body wasn't JSON -- fall back to statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export interface UploadImageResult {
  url: string;
  /** Only set when trim=true was requested and the backend actually cropped the image (see
   * ImageField's autoTrim prop) -- the hook percent to use for the now-cropped hanging photo. */
  hookPercent: number | null;
}

/** Uploads an image for the admin and returns its "/uploads/..." path. (Separate from apiFetch because
 * it sends multipart form data, and the browser has to set that Content-Type itself.)
 *
 * @param trim Only for hanging-rail cutouts: crop transparent padding server-side and return the
 *        matching hook percent. Never set for ordinary product photos. */
export async function uploadImage(file: File, token: string, trim = false): Promise<UploadImageResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/admin/uploads${trim ? '?trim=true' : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (await res.json()).message || message;
    } catch {
      // response body wasn't JSON -- fall back to statusText
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as UploadImageResult;
}

/** Uploads a single condition-proof photo for a return request. No admin token -- a guest attaching
 * proof to their own return has the same standing as viewing/cancelling the order itself (the
 * unguessable order id is the only credential this whole guest-checkout model relies on). */
export async function uploadReturnPhoto(orderId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/returns/photos`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (await res.json()).message || message;
    } catch {
      // response body wasn't JSON -- fall back to statusText
    }
    throw new ApiError(res.status, message);
  }
  return ((await res.json()) as { url: string }).url;
}
