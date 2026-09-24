'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth } from '@/lib/auth';

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
  const [price, setPrice] = useState('');
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
      setError('Enter a stock quantity for at least one size/color combination (or, for a simple product, in the Stock field).');
      return;
    }

    // Catches exactly the trap of adding a color's photo but forgetting to enter its stock in the
    // grid -- that color would silently have an image and zero real variants, so it would never
    // actually be selectable even though it looks fully set up.
    const stockedColors = new Set(variants.map((v) => v.color).filter(Boolean));
    const orphanedImageColors = Array.from(new Set(images.map((i) => i.colorGroup).filter(Boolean))).filter(
      (c) => !stockedColors.has(c)
    );
    if (orphanedImageColors.length > 0) {
      setError(
        `${orphanedImageColors.join(', ')} ${orphanedImageColors.length > 1 ? 'have' : 'has'} a photo but no stock entered for any size in the grid above -- add stock for ${orphanedImageColors.length > 1 ? 'them' : 'it'}, or remove the image.`
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
          taxCode: taxCode || null,
          price: Number(price),
          variants: variants.map((v) => ({
            sku: null,
            size: v.size,
            color: v.color,
            stockQty: v.stockQty,
            lowStockThreshold: Number(lowStockThreshold || '5')
          })),
          images: images.filter((i) => i.url).map((i, idx) => ({ url: i.url, colorGroup: i.colorGroup || null, sortOrder: idx }))
        }
      });
      router.push('/admin/products');
    } catch {
      setError('Could not create the product.');
    } finally {
      setSaving(false);
    }
  }

  const rows = sizes.length > 0 ? sizes : [null];
  const cols = colors.length > 0 ? colors : [null];

  return (
    <div className="max-w-3xl">
      <h1 className="page-heading mb-6">New product</h1>
      <form onSubmit={submit} className="space-y-8">
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Slug</label>
            <input
              placeholder="auto from name if left blank"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-xs text-ink/40">Applies to every size/color of this product.</p>
            </div>
            <div>
              <label className="label">Stripe tax code</label>
              <input
                placeholder="optional -- see Stripe Dashboard"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="label mb-3">Colors</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {colors.map((c) => (
              <span key={c} className="badge bg-line text-ink">
                {c}
                <button type="button" onClick={() => removeColor(c)} className="ml-1.5 text-ink/50 hover:text-red-600">
                  ×
                </button>
              </span>
            ))}
            {colors.length === 0 && (
              <p className="text-sm text-ink/40">No colors added -- leave blank if this product doesn&apos;t come in different colors.</p>
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
              placeholder="e.g. Green"
              className="input"
            />
            <button type="button" onClick={addColor} className="btn-secondary shrink-0">
              + Add color
            </button>
          </div>
        </div>

        <div className="card p-6">
          <p className="label mb-3">Sizes</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <span key={s} className="badge bg-line text-ink">
                {s}
                <button type="button" onClick={() => removeSize(s)} className="ml-1.5 text-ink/50 hover:text-red-600">
                  ×
                </button>
              </span>
            ))}
            {sizes.length === 0 && <p className="text-sm text-ink/40">No sizes added -- leave blank if this product is one-size.</p>}
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
              placeholder="e.g. M"
              className="input"
            />
            <button type="button" onClick={addSize} className="btn-secondary shrink-0">
              + Add size
            </button>
          </div>
        </div>

        <div className="card p-6">
          <p className="label mb-1">Stock</p>
          {sizes.length === 0 && colors.length === 0 ? (
            <>
              <p className="mb-3 text-sm text-ink/50">No sizes or colors added -- this will be a single simple product.</p>
              <input
                type="number"
                min="0"
                value={simpleStock}
                onChange={(e) => setSimpleStock(e.target.value)}
                className="input w-32"
              />
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink/50">
                Fill in stock only for combinations that actually exist — leave a cell blank if that size/color isn&apos;t sold, so
                it never shows as selectable to customers.
              </p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left" />
                      {cols.map((c) => (
                        <th key={c ?? '_'} className="p-2 text-center font-medium text-ink">
                          {c ?? 'Stock'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s ?? '_'}>
                        <td className="p-2 font-medium text-ink">{s ?? ''}</td>
                        {cols.map((c) => {
                          const key = cellKey(s, c);
                          return (
                            <td key={c ?? '_'} className="p-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="—"
                                value={stockGrid[key] ?? ''}
                                onChange={(e) => setStockGrid((g) => ({ ...g, [key]: e.target.value }))}
                                className="input w-20 text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="mt-4">
            <label className="label">Low stock threshold</label>
            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="input w-32"
            />
            <p className="mt-1 text-xs text-ink/40">Applies to every size/color combination above.</p>
          </div>
        </div>

        <div className="card p-6">
          <p className="label mb-3">Images</p>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Image URL"
                  value={img.url}
                  onChange={(e) => updateImage(i, 'url', e.target.value)}
                  className="input col-span-2"
                />
                <select value={img.colorGroup} onChange={(e) => updateImage(i, 'colorGroup', e.target.value)} className="input">
                  <option value="">All colors</option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setImages((imgs) => [...imgs, { url: '', colorGroup: '' }])} className="btn-ghost mt-3">
            + Add image
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Create product'}
        </button>
      </form>
    </div>
  );
}
