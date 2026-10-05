'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ApiError, apiFetch, mediaUrl, uploadImage } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { ImageField } from '@/components/admin/ImageField';
import type { ProductDetailResponse } from '@/lib/types';

interface GridCell {
  variantId: string | null;
  stock: string; // '' = this size/color combination doesn't exist
}

function cellKey(size: string | null, color: string | null) {
  return `${size ?? ''}::${color ?? ''}`;
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [taxCode, setTaxCode] = useState('');
  const [price, setPrice] = useState('');
  const [hangingImageUrl, setHangingImageUrl] = useState('');
  const [hangingHookPercent, setHangingHookPercent] = useState('');
  const [saving, setSaving] = useState(false);

  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [grid, setGrid] = useState<Record<string, GridCell>>({});
  const [originalGrid, setOriginalGrid] = useState<Record<string, GridCell>>({});
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [variantStatus, setVariantStatus] = useState<string | null>(null);
  const [savingVariants, setSavingVariants] = useState(false);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageColor, setNewImageColor] = useState('');
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const newImageFileInput = useRef<HTMLInputElement>(null);

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<ProductDetailResponse>(`/api/admin/products/${params.id}`, { token: auth.token })
      .then((p) => {
        setProduct(p);
        setName(p.name);
        setDescription(p.description || '');
        setStatus(p.status);
        setTaxCode(p.taxCode || '');
        setPrice(String(p.price));
        setHangingImageUrl(p.hangingImageUrl || '');
        setHangingHookPercent(p.hangingHookPercent == null ? '' : String(p.hangingHookPercent));

        setSizes(Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean))) as string[]);
        setColors(Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean))) as string[]);

        const nextGrid: Record<string, GridCell> = {};
        p.variants.forEach((v) => {
          nextGrid[cellKey(v.size, v.color)] = { variantId: v.id, stock: String(v.stockQty) };
        });
        setGrid(nextGrid);
        setOriginalGrid(nextGrid);
      })
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
  }, [params.id]);

  async function save() {
    setSaving(true);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        token: auth?.token,
        body: {
          name,
          description,
          status,
          taxCode: taxCode || null,
          categoryId: product?.categoryId ?? null,
          weightGrams: null,
          price: Number(price),
          hangingImageUrl: hangingImageUrl || null,
          hangingHookPercent: hangingHookPercent === '' ? null : Number(hangingHookPercent)
        }
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!confirm('Delete this product permanently?')) return;
    const auth = getAdminAuth();
    await apiFetch(`/api/admin/products/${params.id}`, { method: 'DELETE', token: auth?.token });
    router.push('/admin/products');
  }

  function addSize() {
    const s = sizeInput.trim();
    if (s && !sizes.includes(s)) setSizes((ss) => [...ss, s]);
    setSizeInput('');
  }
  function addColor() {
    const c = colorInput.trim();
    if (c && !colors.includes(c)) setColors((cs) => [...cs, c]);
    setColorInput('');
  }

  /** Removing a size/color that already has saved stock means deleting every variant that uses it --
   * there's no "half exists" state a variant can be left in, so this deletes first and reloads from the
   * server rather than just hiding it locally. A size/color the admin only just added (never saved) has
   * no variantId anywhere, so the loop below is a no-op and the reload simply won't bring it back. */
  async function removeSize(s: string) {
    if (!confirm(`Remove size "${s}"? This deletes every existing variant using it.`)) return;
    const auth = getAdminAuth();
    const cols = colors.length > 0 ? colors : [null];
    try {
      for (const c of cols) {
        const variantId = grid[cellKey(s, c)]?.variantId;
        if (variantId) {
          await apiFetch(`/api/admin/products/variants/${variantId}`, { method: 'DELETE', token: auth?.token });
        }
      }
      load();
    } catch {
      setVariantStatus(`Could not remove size "${s}".`);
    }
  }

  async function removeColor(c: string) {
    if (!confirm(`Remove color "${c}"? This deletes every existing variant using it.`)) return;
    const auth = getAdminAuth();
    const rows = sizes.length > 0 ? sizes : [null];
    try {
      for (const s of rows) {
        const variantId = grid[cellKey(s, c)]?.variantId;
        if (variantId) {
          await apiFetch(`/api/admin/products/variants/${variantId}`, { method: 'DELETE', token: auth?.token });
        }
      }
      load();
    } catch {
      setVariantStatus(`Could not remove color "${c}".`);
    }
  }

  function setCellStock(key: string, value: string) {
    setGrid((g) => ({ ...g, [key]: { variantId: g[key]?.variantId ?? null, stock: value } }));
  }

  async function saveVariants() {
    setSavingVariants(true);
    setVariantStatus('Saving…');
    const auth = getAdminAuth();
    const rows = sizes.length > 0 ? sizes : [null];
    const cols = colors.length > 0 ? colors : [null];

    try {
      for (const s of rows) {
        for (const c of cols) {
          const key = cellKey(s, c);
          const cell = grid[key];
          const original = originalGrid[key];
          const stockValue = cell?.stock ?? '';

          if (cell?.variantId) {
            if (stockValue === '') {
              await apiFetch(`/api/admin/products/variants/${cell.variantId}`, { method: 'DELETE', token: auth?.token });
            } else if (stockValue !== original?.stock) {
              await apiFetch(`/api/admin/products/variants/${cell.variantId}`, {
                method: 'PATCH',
                token: auth?.token,
                body: { stockQty: Number(stockValue), lowStockThreshold: Number(lowStockThreshold || '5') }
              });
            }
          } else if (stockValue !== '') {
            await apiFetch(`/api/admin/products/${params.id}/variants`, {
              method: 'POST',
              token: auth?.token,
              body: { sku: null, size: s, color: c, stockQty: Number(stockValue), lowStockThreshold: Number(lowStockThreshold || '5') }
            });
          }
        }
      }
      setVariantStatus('Saved successfully');
      load();
    } catch {
      setVariantStatus('Could not save some variants.');
    } finally {
      setSavingVariants(false);
    }
  }

  async function onNewImageFileChosen(file: File | undefined) {
    if (!file) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setUploadingImage(true);
    setImageStatus(null);
    try {
      setNewImageUrl((await uploadImage(file, auth.token)).url);
    } catch (err) {
      if (isAdminAuthError(err)) {
        clearAdminAuth();
        router.push('/admin/login');
        return;
      }
      setImageStatus(err instanceof ApiError ? err.message : 'Could not upload the image.');
    } finally {
      setUploadingImage(false);
      if (newImageFileInput.current) newImageFileInput.current.value = '';
    }
  }

  async function addImage(e: FormEvent) {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    const auth = getAdminAuth();
    setImageStatus(null);
    try {
      await apiFetch(`/api/admin/products/${params.id}/images`, {
        method: 'POST',
        token: auth?.token,
        body: { url: newImageUrl.trim(), colorGroup: newImageColor || null, sortOrder: product?.images.length ?? 0 }
      });
      setNewImageUrl('');
      setNewImageColor('');
      load();
    } catch {
      setImageStatus('Could not add image.');
    }
  }

  async function deleteImage(imageId: string) {
    const auth = getAdminAuth();
    setImageStatus(null);
    try {
      await apiFetch(`/api/admin/products/images/${imageId}`, { method: 'DELETE', token: auth?.token });
      load();
    } catch (err) {
      if (isAdminAuthError(err)) {
        clearAdminAuth();
        router.push('/admin/login');
        return;
      }
      setImageStatus(err instanceof ApiError ? err.message : 'Could not delete that image.');
    }
  }

  if (!product) {
    return (
      <div className="w-full max-w-[1700px] py-16 text-center font-sans">
        <p className="text-sm text-[#10100F]/60">Loading product details…</p>
      </div>
    );
  }

  const rows = sizes.length > 0 ? sizes : [null];
  const cols = colors.length > 0 ? colors : [null];

  const stockedColors = new Set(
    Object.entries(grid)
      .filter(([, cell]) => cell.stock !== '')
      .map(([key]) => key.split('::')[1])
      .filter(Boolean)
  );
  const orphanedImageColors = Array.from(new Set(product.images.map((i) => i.colorGroup).filter(Boolean))).filter(
    (c) => !stockedColors.has(c as string)
  );

  return (
    <div className="w-full max-w-[1700px] space-y-6 font-sans">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <Link
            href="/admin/products"
            className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 hover:text-[#10100F] inline-flex items-center gap-1 mb-1.5"
          >
            <span>← Back to Products</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              {product.name}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-[#10100F]/50 mt-1">/{product.slug}</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-white hover:bg-[#f3f3f1] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#10100F] transition-all shadow-2xs active:scale-95"
          >
            <span>Live Store ↗</span>
          </a>
          <button
            onClick={deleteProduct}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
          >
            <span>Delete</span>
          </button>
        </div>
      </div>

      {orphanedImageColors.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
          <strong>{orphanedImageColors.join(', ')}</strong> {orphanedImageColors.length > 1 ? 'have' : 'has'} a photo below but no stock entered for any size — {orphanedImageColors.length > 1 ? "they won't" : "it won't"} show as an option to customers until you add stock in the grid and save.
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Details & Matrix) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-[#e5ded2] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                General Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                  Product Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                  Catalog Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                  Base Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm font-bold text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                  Stripe Tax Code (Optional)
                </label>
                <input
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  placeholder="e.g. txcd_99999999"
                  className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
              >
                {saving ? 'Saving Details…' : 'Save Details'}
              </button>
            </div>
          </div>

          {/* Sizes & Colors Configuration */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-[#e5ded2] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Variants Setup (Sizes &amp; Colors)
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 block mb-2">
                  Active Sizes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.length > 0 ? (
                    sizes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-[#f3f3f1] pl-3 pr-2 py-1 text-xs font-bold text-[#10100F]"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSize(s)}
                          aria-label={`Remove size ${s}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[#10100F]/40 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#10100F]/40 italic">No specific sizes defined (One Size)</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/60 block mb-2">
                  Active Colors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {colors.length > 0 ? (
                    colors.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-[#f3f3f1] pl-3 pr-2 py-1 text-xs font-bold text-[#10100F]"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeColor(c)}
                          aria-label={`Remove color ${c}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[#10100F]/40 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#10100F]/40 italic">No specific colors defined</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap gap-3 border-t border-[#e5ded2]">
              <div className="flex items-center gap-2">
                <input
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSize();
                    }
                  }}
                  placeholder="New Size (e.g. XL)"
                  className="w-36 rounded-full border border-[#e5ded2] bg-white px-3.5 py-1.5 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={addSize}
                  className="rounded-full border border-[#e5ded2] bg-[#f3f3f1] hover:bg-[#10100F] hover:text-white px-4 py-1.5 text-xs font-bold uppercase text-[#10100F] transition-colors"
                >
                  + Size
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addColor();
                    }
                  }}
                  placeholder="New Color (e.g. Forest)"
                  className="w-36 rounded-full border border-[#e5ded2] bg-white px-3.5 py-1.5 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="rounded-full border border-[#e5ded2] bg-[#f3f3f1] hover:bg-[#10100F] hover:text-white px-4 py-1.5 text-xs font-bold uppercase text-[#10100F] transition-colors"
                >
                  + Color
                </button>
              </div>
            </div>
          </div>

          {/* Inventory Stock Matrix Card */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-[#e5ded2] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Inventory Quantities Matrix
              </h2>
              <p className="text-xs text-[#10100F]/60 mt-1">
                Enter stock counts for each combination. Empty cells are excluded from sale.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e5ded2]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ded2] bg-[#f3f3f1]/80">
                    <th className="py-2.5 px-3 font-bold uppercase text-[#10100F]/70">Size</th>
                    {cols.map((c) => (
                      <th key={c ?? '_'} className="py-2.5 px-3 font-bold uppercase text-[#10100F] text-center">
                        {c ?? 'Default Color'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded2]/70">
                  {rows.map((s) => (
                    <tr key={s ?? '_'} className="hover:bg-[#f3f3f1]/40">
                      <td className="py-2.5 px-3 font-bold text-[#10100F]">
                        {s ?? 'Standard'}
                      </td>
                      {cols.map((c) => {
                        const key = cellKey(s, c);
                        return (
                          <td key={c ?? '_'} className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="—"
                              value={grid[key]?.stock ?? ''}
                              onChange={(e) => setCellStock(key, e.target.value)}
                              className="w-20 rounded-md border border-[#e5ded2] bg-white px-2 py-1 text-center font-bold text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#e5ded2] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70">
                  Low Stock Threshold:
                </span>
                <input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-20 rounded-lg border border-[#e5ded2] bg-white px-2.5 py-1 text-center text-xs font-bold text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                />
              </div>

              <button
                onClick={saveVariants}
                disabled={savingVariants}
                className="rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
              >
                {savingVariants ? 'Saving Stock…' : 'Save Stock Changes'}
              </button>
            </div>

            {variantStatus && (
              <p className="text-xs p-2.5 rounded-lg bg-[#f3f3f1] text-[#10100F]/80 font-medium">
                {variantStatus}
              </p>
            )}
          </div>
        </div>

        {/* Right Column (Images & Metadata) */}
        <div className="space-y-6">
          {/* Hanging Rail Cover Photo Card */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-[#e5ded2] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Hanging Rail Photo (Optional)
              </h2>
              <p className="text-xs text-[#10100F]/50 mt-1">
                A transparent-background cutout of the garment on a hanger. Used on the homepage&rsquo;s hanging rail and
                as this page&rsquo;s cover photo. Without one, both fall back to the normal photos below.
              </p>
            </div>
            <ImageField
              label="Hanging Photo"
              name="hangingImageUrl"
              value={hangingImageUrl}
              onChange={setHangingImageUrl}
              onAuthError={() => {
                clearAdminAuth();
                router.push('/admin/login');
              }}
              required={false}
              autoTrim
              onHookPercentDetected={(percent) => setHangingHookPercent(String(percent))}
            />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                Hook Position (% from top)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="12"
                value={hangingHookPercent}
                onChange={(e) => setHangingHookPercent(e.target.value)}
                className="w-28 rounded-lg border border-[#e5ded2] bg-white px-3 py-2 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
              />
              <p className="mt-1 text-[11px] text-[#10100F]/50">
                How far down the photo the hanger&rsquo;s hook sits. Auto-filled when you upload a photo above -- adjust only if it looks off.
              </p>
            </div>
            <p className="text-[11px] text-[#10100F]/50 border-t border-[#e5ded2] pt-3">
              Uploading a photo doesn&rsquo;t save it by itself &mdash; click &ldquo;Save Details&rdquo; above once you&rsquo;re done.
            </p>
          </div>

          {/* Images Card */}
          <div className="rounded-xl border border-[#e5ded2] bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-[#e5ded2] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                Product Imagery ({product.images.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {product.images.map((img) => (
                <div key={img.id} className="relative rounded-xl border border-[#e5ded2] bg-[#f3f3f1] overflow-hidden group shadow-2xs">
                  <div className="relative h-28 w-full">
                    <Image src={mediaUrl(img.url)} alt="" fill unoptimized className="object-cover" />
                  </div>
                  <div className="p-2 bg-white flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#10100F]/70 truncate max-w-[80px]">
                      {img.colorGroup ?? 'All'}
                    </span>
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="text-rose-600 hover:text-rose-800 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {product.images.length === 0 && (
                <div className="col-span-2 py-6 text-center text-xs text-[#10100F]/50">
                  No images attached yet.
                </div>
              )}
            </div>

            {/* Add Image Form */}
            <form onSubmit={addImage} className="pt-2 border-t border-[#e5ded2] space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/70 block">
                Attach New Photo
              </span>
              <div className="flex items-center gap-3">
                <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-[#e5ded2] bg-[#f3f3f1]">
                  {newImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(newImageUrl)} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] uppercase font-sans text-[#10100F]/30">Empty</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => newImageFileInput.current?.click()}
                  className="rounded-lg border border-[#10100F] bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-all disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading…' : newImageUrl ? 'Replace' : 'Upload Photo'}
                </button>
                {newImageUrl && (
                  <button
                    type="button"
                    onClick={() => setNewImageUrl('')}
                    className="text-xs font-bold uppercase tracking-wider text-red-700/80 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={newImageFileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => onNewImageFileChosen(e.target.files?.[0])}
                />
              </div>
              <select
                value={newImageColor}
                onChange={(e) => setNewImageColor(e.target.value)}
                className="w-full rounded-lg border border-[#e5ded2] bg-white px-3.5 py-2 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
              >
                <option value="">Shown for all colors</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    Only for: {c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newImageUrl.trim()}
                className="w-full rounded-full border border-[#e5ded2] bg-[#f3f3f1] hover:bg-[#10100F] hover:text-white px-4 py-2.5 text-xs font-bold uppercase text-[#10100F] transition-all shadow-2xs active:scale-95 disabled:opacity-40 disabled:hover:bg-[#f3f3f1] disabled:hover:text-[#10100F]"
              >
                + Add Photo
              </button>
            </form>
            {imageStatus && <p className="text-xs text-rose-700">{imageStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
