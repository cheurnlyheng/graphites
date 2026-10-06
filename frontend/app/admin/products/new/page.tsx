'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, apiFetch, mediaUrl, uploadImage } from '@/lib/api';
import { getAdminAuth, isAdminAuthError } from '@/lib/auth';
import { ImageField } from '@/components/admin/ImageField';

interface ImageForm {
  url: string;
  colorGroup: string; // '' = shown for every color
}

function cellKey(size: string | null, color: string | null) {
  return `${size ?? ''}::${color ?? ''}`;
}

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');
  const [price, setPrice] = useState('');
  const [hangingImageUrl, setHangingImageUrl] = useState('');
  const [hangingHookPercent, setHangingHookPercent] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [simpleStock, setSimpleStock] = useState('0');
  const [stockGrid, setStockGrid] = useState<Record<string, string>>({});

  const [images, setImages] = useState<ImageForm[]>([{ url: '', colorGroup: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const imageFileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  function addColor() {
    const c = colorInput.trim();
    if (c && !colors.includes(c)) setColors((cs) => [...cs, c]);
    setColorInput('');
  }

  function removeColor(c: string) {
    setColors((cs) => cs.filter((x) => x !== c));
    setStockGrid((g) => {
      const next = { ...g };
      Object.keys(next).forEach((k) => {
        if (k.endsWith(`::${c}`)) delete next[k];
      });
      return next;
    });
  }

  function addSize() {
    const s = sizeInput.trim();
    if (s && !sizes.includes(s)) setSizes((ss) => [...ss, s]);
    setSizeInput('');
  }

  function removeSize(s: string) {
    setSizes((ss) => ss.filter((x) => x !== s));
    setStockGrid((g) => {
      const next = { ...g };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${s}::`)) delete next[k];
      });
      return next;
    });
  }

  function updateImage(i: number, field: keyof ImageForm, value: string) {
    setImages((imgs) => imgs.map((img, idx) => (idx === i ? { ...img, [field]: value } : img)));
  }

  function removeImage(i: number) {
    setImages((imgs) => imgs.filter((_, idx) => idx !== i));
  }

  async function onImageFileChosen(i: number, file: File | undefined) {
    if (!file) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setUploadingIndex(i);
    setError(null);
    try {
      updateImage(i, 'url', (await uploadImage(file, auth.token)).url);
    } catch (err) {
      if (isAdminAuthError(err)) {
        router.push('/admin/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not upload the image.');
    } finally {
      setUploadingIndex(null);
      const input = imageFileInputs.current[i];
      if (input) input.value = '';
    }
  }

  function buildVariants() {
    if (sizes.length === 0 && colors.length === 0) {
      return [{ size: null as string | null, color: null as string | null, stockQty: Number(simpleStock || '0') }];
    }
    const rows = sizes.length > 0 ? sizes : [null];
    const cols = colors.length > 0 ? colors : [null];
    const variants: { size: string | null; color: string | null; stockQty: number }[] = [];
    for (const s of rows) {
      for (const c of cols) {
        const raw = stockGrid[cellKey(s, c)];
        if (raw === undefined || raw === '') continue; // never filled in -> this combo doesn't exist
        variants.push({ size: s, color: c, stockQty: Number(raw) });
      }
    }
    return variants;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const variants = buildVariants();
    if (variants.length === 0) {
      setError('Enter a stock quantity for at least one size/color combination (or for a simple product in the stock input).');
      return;
    }

    const stockedColors = new Set(variants.map((v) => v.color).filter(Boolean));
    const orphanedImageColors = Array.from(new Set(images.map((i) => i.colorGroup).filter(Boolean))).filter(
      (c) => !stockedColors.has(c)
    );
    if (orphanedImageColors.length > 0) {
      setError(
        `${orphanedImageColors.join(', ')} ${orphanedImageColors.length > 1 ? 'have' : 'has'} a photo but no stock entered in the inventory matrix above. Add stock for this color or remove the photo.`
      );
      return;
    }

    setSaving(true);
    try {
      const auth = getAdminAuth();
      await apiFetch('/api/admin/products', {
        method: 'POST',
        token: auth?.token,
        body: {
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          status,
          taxCode: taxCode || null,
          price: Number(price),
          variants: variants.map((v) => ({
            sku: null,
            size: v.size,
            color: v.color,
            stockQty: v.stockQty,
            lowStockThreshold: Number(lowStockThreshold || '5')
          })),
          images: images.filter((i) => i.url.trim()).map((i, idx) => ({ url: i.url.trim(), colorGroup: i.colorGroup || null, sortOrder: idx })),
          hangingImageUrl: hangingImageUrl || null,
          hangingHookPercent: hangingHookPercent === '' ? null : Number(hangingHookPercent)
        }
      });
      router.push('/admin/products');
    } catch {
      setError('Could not create the product. Please check your inputs and try again.');
    } finally {
      setSaving(false);
    }
  }

  const rows = sizes.length > 0 ? sizes : [null];
  const cols = colors.length > 0 ? colors : [null];
  const activeVariants = buildVariants();
  const totalStockUnits = activeVariants.reduce((sum, v) => sum + (v.stockQty || 0), 0);

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1.5">
            Catalog &amp; Inventory
          </span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">
              New Product Silhouette
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#10100F]/60 max-w-2xl">
            Register a new garment or accessory with custom color palettes, sizing scales, inventory counts, and multi-angle product photography.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 rounded-full border border-[#e5ded2] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#f3f3f1] transition-colors self-start sm:self-auto shadow-2xs"
        >
          ← Back to Catalog
        </Link>
      </div>

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Attributes & Variants (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Card 1: Core Details */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                  01. Product Information
                </h2>
                <span className="text-xs text-[#10100F]/50 font-medium">General Attributes</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                    Product Title *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ultralight Storm Poncho"
                    className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                      URL Slug
                    </label>
                    <input
                      placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'auto-generated-from-title'}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                    />
                    <p className="mt-1 text-[11px] text-[#10100F]/50">Auto-slugified if left empty</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                      Base Retail Price (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#10100F]/40 font-bold">$</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="185.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-lg border border-[#e5ded2] bg-white pl-8 pr-4 py-2.5 text-sm font-bold text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                    Description &amp; Garment Details
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Technical waterproof polyurethane fabrication with ultrasonically welded seams, snap-button closure, and storm hood visor..."
                    className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all leading-relaxed font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}
                      className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm font-semibold text-[#10100F] focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                    >
                      <option value="DRAFT">Draft (hidden from storefront)</option>
                      <option value="ACTIVE">Active (visible on storefront)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                      Low Stock Reorder Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm font-semibold text-[#10100F] focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5">
                    Stripe Tax Code
                  </label>
                  <input
                    placeholder="txcd_99999999 (optional)"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none focus:ring-1 focus:ring-[#10100F]/20 transition-all font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Variations Definition */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                  02. Colors &amp; Sizes Matrix Builder
                </h2>
                <span className="text-xs text-[#10100F]/50 font-medium">Variants Blueprint</span>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-2">
                  Color Options ({colors.length})
                </label>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[34px] items-center">
                  {colors.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-[#f3f3f1] pl-3 pr-2 py-1 text-xs font-bold uppercase tracking-wider text-[#10100F]"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeColor(c)}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[#10100F]/40 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {colors.length === 0 && (
                    <p className="text-xs text-[#10100F]/40 italic">No colors configured — product will be neutral / single-color.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addColor();
                      }
                    }}
                    placeholder="e.g. Slate Grey, Olive, Black"
                    className="max-w-xs flex-1 rounded-full border border-[#e5ded2] bg-white px-4 py-2 text-xs text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="rounded-full border border-[#e5ded2] bg-[#f3f3f1] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-colors"
                  >
                    + Add Color
                  </button>
                </div>
              </div>

              {/* Sizes */}
              <div className="pt-2 border-t border-[#e5ded2]/60">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-2">
                  Size Scale ({sizes.length})
                </label>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[34px] items-center">
                  {sizes.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e5ded2] bg-[#f3f3f1] pl-3 pr-2 py-1 text-xs font-bold uppercase tracking-wider text-[#10100F]"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSize(s)}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[#10100F]/40 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {sizes.length === 0 && (
                    <p className="text-xs text-[#10100F]/40 italic">No sizes configured — product will be one-size / OS.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSize();
                      }
                    }}
                    placeholder="e.g. XS, S, M, L, XL"
                    className="max-w-xs flex-1 rounded-full border border-[#e5ded2] bg-white px-4 py-2 text-xs text-[#10100F] placeholder:text-[#10100F]/30 focus:border-[#10100F] focus:outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={addSize}
                    className="rounded-full border border-[#e5ded2] bg-[#f3f3f1] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-colors"
                  >
                    + Add Size
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: 2D Inventory Matrix */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                    03. Inventory Matrix
                  </h2>
                  <p className="text-xs text-[#10100F]/50 mt-1">
                    Enter the starting stock quantity for each variant. Leave a cell empty if that combination is not produced.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#10100F] bg-[#f3f3f1] border border-[#e5ded2] px-3.5 py-1.5 rounded-full">
                  {totalStockUnits} Total Units
                </span>
              </div>

              {sizes.length === 0 && colors.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#f3f3f1]/60 border border-[#e5ded2] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#10100F] uppercase tracking-wider">Single Variant SKU</p>
                    <p className="text-xs text-[#10100F]/50 mt-0.5">No sizes or colors defined. Enter total inventory count.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#10100F]/60">Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={simpleStock}
                      onChange={(e) => setSimpleStock(e.target.value)}
                      className="w-24 rounded-lg border border-[#e5ded2] bg-white px-3 py-2 text-center text-sm font-bold text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e5ded2]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f3f3f1]/80 border-b border-[#e5ded2] font-bold uppercase tracking-wider text-[#10100F]/60">
                      <tr>
                        <th className="py-3 px-4 font-bold text-[#10100F]">Size \ Color</th>
                        {cols.map((c) => (
                          <th key={c ?? 'default'} className="py-3 px-4 text-center">
                            {c ?? 'Standard'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5ded2]">
                      {rows.map((s) => (
                        <tr key={s ?? 'default'} className="hover:bg-[#f3f3f1]/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-sm text-[#10100F] bg-[#f3f3f1]/50">
                            {s ?? 'Standard'}
                          </td>
                          {cols.map((c) => {
                            const key = cellKey(s, c);
                            const val = stockGrid[key] ?? '';
                            return (
                              <td key={c ?? 'default'} className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="—"
                                  value={val}
                                  onChange={(e) => setStockGrid((g) => ({ ...g, [key]: e.target.value }))}
                                  className={`w-20 rounded-md border py-1.5 text-center text-xs font-bold transition-all focus:outline-none font-sans ${
                                    val !== ''
                                      ? 'border-[#10100F] bg-white text-[#10100F] ring-1 ring-[#10100F]/10'
                                      : 'border-[#e5ded2] bg-[#f3f3f1]/40 text-[#10100F]/40 placeholder:text-[#10100F]/20'
                                  }`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Media & Actions */}
          <div className="space-y-8">
            {/* Hanging Rail Cover Photo */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="border-b border-[#e5ded2] pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                  Hanging Rail Photo (Optional)
                </h2>
                <p className="text-xs text-[#10100F]/50 mt-1">
                  A transparent-background cutout of the garment on a hanger, for the homepage&rsquo;s hanging rail and this
                  product&rsquo;s cover photo. Can be added later -- both fall back to the normal photos below without it.
                </p>
              </div>
              <ImageField
                label="Hanging Photo"
                name="hangingImageUrl"
                value={hangingImageUrl}
                onChange={setHangingImageUrl}
                onAuthError={() => router.push('/admin/login')}
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
                <p className="mt-1 text-[11px] text-[#10100F]/50">Auto-filled when you upload a photo above -- adjust only if it looks off.</p>
              </div>
            </div>

            {/* Card 4: Images */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                  04. Media Assets
                </h2>
                <span className="text-xs text-[#10100F]/50 font-medium">{images.filter((i) => i.url.trim()).length} Images</span>
              </div>

              <div className="space-y-4">
                {images.map((img, i) => (
                  <div key={i} className="rounded-xl border border-[#e5ded2] bg-[#f3f3f1]/40 p-3.5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e5ded2] bg-white">
                        {img.url.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(img.url.trim())}
                            alt=""
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#10100F]/30 uppercase font-bold">
                            Empty
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={uploadingIndex === i}
                            onClick={() => imageFileInputs.current[i]?.click()}
                            className="flex-1 rounded-lg border border-[#10100F] bg-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-all disabled:opacity-50"
                          >
                            {uploadingIndex === i ? 'Uploading…' : img.url.trim() ? 'Replace Photo' : 'Upload Photo'}
                          </button>
                          {img.url.trim() && (
                            <button
                              type="button"
                              onClick={() => updateImage(i, 'url', '')}
                              className="shrink-0 rounded-lg px-2 text-xs font-bold uppercase tracking-wider text-red-700/80 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                          <input
                            ref={(el) => {
                              imageFileInputs.current[i] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => onImageFileChosen(i, e.target.files?.[0])}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={img.colorGroup}
                            onChange={(e) => updateImage(i, 'colorGroup', e.target.value)}
                            className="flex-1 rounded-lg border border-[#e5ded2] bg-white px-3 py-1.5 text-xs text-[#10100F] focus:border-[#10100F] focus:outline-none font-sans"
                          >
                            <option value="">Applies to All Colors</option>
                            {colors.map((c) => (
                              <option key={c} value={c}>
                                Color: {c}
                              </option>
                            ))}
                          </select>
                          {images.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="rounded-full px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setImages((imgs) => [...imgs, { url: '', colorGroup: '' }])}
                  className="w-full rounded-full border border-dashed border-[#e5ded2] py-2.5 text-xs font-bold uppercase tracking-wider text-[#10100F]/70 hover:border-[#10100F] hover:text-[#10100F] hover:bg-[#f3f3f1] transition-colors"
                >
                  + Add Another Photo
                </button>
              </div>
            </div>

            {/* Card 5: Pre-publish Summary & Action */}
            <div className="rounded-xl border border-[#e5ded2] bg-white p-6 sm:p-8 shadow-2xs space-y-6 sticky top-6">
              <div className="flex items-center justify-between border-b border-[#e5ded2] pb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
                  Publish Summary
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-bold border ${
                    status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  ● {status === 'ACTIVE' ? 'Active' : 'Draft'}
                </span>
              </div>

              <div className="space-y-3 text-xs text-[#10100F]/70">
                <div className="flex justify-between py-1 border-b border-[#e5ded2]/50">
                  <span>Variants Configured</span>
                  <span className="font-bold text-[#10100F]">{activeVariants.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e5ded2]/50">
                  <span>Total Stock Units</span>
                  <span className="font-bold text-[#10100F]">{totalStockUnits}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e5ded2]/50">
                  <span>Price per Unit</span>
                  <span className="font-bold text-[#10100F]">{price ? `$${Number(price).toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Media Assets</span>
                  <span className="font-bold text-[#10100F]">{images.filter((i) => i.url.trim()).length}</span>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-full bg-[#10100F] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating Product…
                    </>
                  ) : (
                    'Create Product'
                  )}
                </button>

                <Link
                  href="/admin/products"
                  className="block text-center rounded-full border border-[#e5ded2] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-[#10100F]/70 hover:bg-[#f3f3f1] hover:text-[#10100F] transition-colors"
                >
                  Discard &amp; Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
