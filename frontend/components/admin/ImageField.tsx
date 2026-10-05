'use client';

import { useRef, useState } from 'react';
import { ApiError, mediaUrl, uploadImage } from '@/lib/api';
import { getAdminAuth, isAdminAuthError } from '@/lib/auth';
import { hintClass, labelClass } from '@/components/admin/styles';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface ImageFieldProps {
  label: string;
  /** Used as the file input's data-testid. */
  name: string;
  value: string;
  onChange: (url: string) => void;
  onAuthError: () => void;
  hint?: string;
  /** False for a field that's fine left empty (e.g. an optional cover photo). Defaults to true -- shows "Required". */
  required?: boolean;
  /** Hanging-rail cutouts only: crop transparent padding server-side on upload, since the rail renders
   * the photo's whole canvas and a photo with lots of headroom above the garment otherwise looks tiny
   * next to the others. Never set for ordinary product photos, which don't have this problem. */
  autoTrim?: boolean;
  /** Fires when autoTrim actually cropped the image, with the hook percent for the new crop -- lets the
   * caller pre-fill the Hook Position field instead of leaving the admin to guess it from scratch. */
  onHookPercentDetected?: (percent: number) => void;
}

/** Upload an image (JPG, PNG, WebP or GIF up to 10 MB), with a thumbnail of the current one. Upload only --
 * no URL to type or paste, since every image an admin actually has is a file on their computer. */
export function ImageField({
  label,
  name,
  value,
  onChange,
  onAuthError,
  hint,
  required = true,
  autoTrim = false,
  onHookPercentDetected
}: ImageFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    const auth = getAdminAuth();
    if (!auth) {
      onAuthError();
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That file is too large -- the maximum upload size is 10 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadImage(file, auth.token, autoTrim);
      onChange(result.url);
      if (result.hookPercent != null) {
        onHookPercentDetected?.(result.hookPercent);
      }
    } catch (err) {
      if (isAdminAuthError(err)) {
        onAuthError();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div>
      <label className={labelClass}>
        {label} {required && !value && <span className="text-red-600/70 normal-case tracking-normal">(required)</span>}
      </label>
      <div className="flex gap-4">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e5ded2] bg-[#f3f3f1]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] uppercase font-sans text-[#10100F]/30">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="rounded-full border border-[#10100F] bg-white px-5 py-2 text-xs font-sans font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs font-sans font-bold uppercase tracking-wider text-red-700/80 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              data-testid={`${name}-file`}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0])}
            />
          </div>
          <span className="block text-xs font-sans text-[#10100F]/50">JPG, PNG, WebP or GIF, up to 10 MB</span>
          {error && <p className="text-xs font-medium text-red-700 font-sans">{error}</p>}
          {hint && <p className={hintClass}>{hint}</p>}
        </div>
      </div>
    </div>
  );
}
