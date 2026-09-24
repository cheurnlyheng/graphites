'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
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
          price: Number(price)
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

  function setCellStock(key: string, value: string) {
    setGrid((g) => ({ ...g, [key]: { variantId: g[key]?.variantId ?? null, stock: value } }));
  }

  /** Diffs the grid against what was loaded and applies exactly the create/update/delete calls
   * needed -- an emptied cell removes that variant, a changed number restocks it, a newly filled
   * cell (from a size/color you just added) creates it. Nothing else is touched. */
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
      setVariantStatus('Saved ✓');
      load();
    } catch {
      setVariantStatus('Could not save all changes.');
    } finally {
      setSavingVariants(false);
    }
  }

  async function addImage(e: FormEvent) {
    e.preventDefault();
    if (!newImageUrl) return;
    setImageStatus(null);
    const auth = getAdminAuth();
    try {
      await apiFetch(`/api/admin/products/${params.id}/images`, {
        method: 'POST',
        token: auth?.token,
        body: { url: newImageUrl, colorGroup: newImageColor || null, sortOrder: product?.images.length ?? 0 }
      });
      setNewImageUrl('');
      setNewImageColor('');
      load();
    } catch {
      setImageStatus('Could not add that image.');
    }
  }

  async function deleteImage(imageId: string) {
    const auth = getAdminAuth();
    await apiFetch(`/api/admin/products/images/${imageId}`, { method: 'DELETE', token: auth?.token });
    load();
  }

  if (!product) return <p className="text-ink/50">Loading…</p>;

  const rows = sizes.length > 0 ? sizes : [null];
  const cols = colors.length > 0 ? colors : [null];

  // Catches a color that has a photo but no stock anywhere in the grid (even unsaved edits) --
  // that color would have a picture but never actually be selectable to a customer.
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
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-heading">Edit product</h1>
        <StatusBadge status={status} />
      </div>

      {orphanedImageColors.length > 0 && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{orphanedImageColors.join(', ')}</strong> {orphanedImageColors.length > 1 ? 'have' : 'has'} a photo below but no
          stock entered for any size — {orphanedImageColors.length > 1 ? "they won't" : "it won't"} show as an option to customers
          until you add {orphanedImageColors.length > 1 ? 'their' : 'its'} stock in the grid and save.
        </div>
      )}

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label className="label">Price</label>
          <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
          <p className="mt-1 text-xs text-ink/40">Applies to every size/color of this product.</p>
        </div>
        <div>
          <label className="label">Stripe tax code</label>
          <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className="input" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={deleteProduct} className="btn-danger">
            Delete product
          </button>
        </div>
      </div>

      <div className="mt-8 card p-6">
        <p className="label mb-3">Images</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {product.images.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-md border border-line">
              <Image src={img.url} alt="" width={200} height={150} unoptimized className="h-24 w-full object-cover" />
              <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                <span className="truncate text-ink/60">{img.colorGroup ?? 'All colors'}</span>
                <button onClick={() => deleteImage(img.id)} className="text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
          {product.images.length === 0 && <p className="text-sm text-ink/50">No images yet.</p>}
        </div>
        <form onSubmit={addImage} className="mt-4 grid grid-cols-3 gap-2">
          <input
            placeholder="Image URL"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            className="input col-span-2"
          />
          <select value={newImageColor} onChange={(e) => setNewImageColor(e.target.value)} className="input">
            <option value="">All colors</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary col-span-3">
            + Add image
          </button>
        </form>
        {imageStatus && <p className="mt-2 text-sm text-red-600">{imageStatus}</p>}
      </div>

      <div className="mt-8 card p-6">
        <p className="label mb-3">Sizes & colors</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {sizes.map((s) => (
            <span key={s} className="badge bg-line text-ink">
              {s}
            </span>
          ))}
          {colors.map((c) => (
            <span key={c} className="badge bg-line text-ink">
              {c}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSize();
              }
            }}
            placeholder="Add a size, e.g. M"
            className="input w-44"
          />
          <button type="button" onClick={addSize} className="btn-secondary">
            + Size
          </button>
          <input
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addColor();
              }
            }}
            placeholder="Add a color, e.g. Green"
            className="input w-44"
          />
          <button type="button" onClick={addColor} className="btn-secondary">
            + Color
          </button>
        </div>
      </div>

      <div className="mt-8 card p-6">
        <p className="label mb-1">Stock</p>
        <p className="mb-3 text-sm text-ink/50">
          Edit a number to restock, clear a cell to remove that combination, or fill in a blank cell (after adding a new size or
          color above) to add it. Nothing changes until you click Save below.
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
                          value={grid[key]?.stock ?? ''}
                          onChange={(e) => setCellStock(key, e.target.value)}
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
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Low stock threshold</label>
            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="input w-32"
            />
            <p className="mt-1 text-xs text-ink/40">Applied to any variant created or restocked here.</p>
          </div>
          <button onClick={saveVariants} disabled={savingVariants} className="btn-primary">
            {savingVariants ? 'Saving…' : 'Save stock changes'}
          </button>
          {variantStatus && <p className="text-sm text-ink/60">{variantStatus}</p>}
        </div>
      </div>
    </div>
  );
}
