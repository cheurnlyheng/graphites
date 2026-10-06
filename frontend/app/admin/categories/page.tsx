'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import type { AdminCategoryResponse } from '@/lib/types';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-[#10100F]/70 mb-1.5 font-sans';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<AdminCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleError(err: unknown, fallback: string) {
    if (isAdminAuthError(err)) {
      clearAdminAuth();
      router.push('/admin/login');
      return;
    }
    setError(err instanceof ApiError ? err.message : fallback);
  }

  function load() {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    apiFetch<AdminCategoryResponse[]>('/api/admin/categories', { token: auth.token })
      .then(setCategories)
      .catch((err) => handleError(err, 'Could not load categories.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setParentId('');
  }

  function startEdit(c: AdminCategoryResponse) {
    setError(null);
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setSlugTouched(true);
    setDescription(c.description ?? '');
    setParentId(c.parentCategoryId ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories', {
        method: editingId ? 'PUT' : 'POST',
        token: auth.token,
        body: { name, slug, description, parentCategoryId: parentId || null }
      });
      resetForm();
      load();
    } catch (err) {
      handleError(err, 'Could not save the category.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: AdminCategoryResponse) {
    const detail =
      c.productCount > 0
        ? `\n\n${c.productCount} product${c.productCount === 1 ? '' : 's'} in it will become uncategorized (they are not deleted).`
        : '';
    if (!(await confirm({ title: 'Delete category', message: `Delete the category "${c.name}"?${detail}`, confirmLabel: 'Delete', danger: true }))) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE', token: auth.token });
      if (editingId === c.id) resetForm();
      load();
    } catch (err) {
      handleError(err, 'Could not delete the category.');
    }
  }

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const parentOptions = categories.filter((c) => c.id !== editingId && !c.parentCategoryId);

  return (
    <div className="w-full max-w-[1700px] space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5ded2] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#10100F]/50 block mb-1">
            Catalog Structure
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#10100F] uppercase">Categories</h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#10100F]/5 text-[#10100F]/70 border border-[#10100F]/10">
              {categories.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Create / Edit Form */}
      <form onSubmit={save} className="rounded-xl border border-[#e5ded2] bg-white p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#e5ded2] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10100F]">
            {editingId ? 'Edit Category' : 'Register New Category'}
          </h2>
          {editingId && (
            <span className="text-xs text-amber-700 font-bold uppercase">
              Editing mode
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={name}
              required
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Long Sleeves"
              className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
            />
          </div>

          <div>
            <label className={labelClass}>Slug (URL identifier)</label>
            <input
              value={slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers and hyphens only"
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="long-sleeves"
              className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
            />
          </div>

          <div>
            <label className={labelClass}>Parent Category (Optional)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
            >
              <option value="">None (Top-Level Category)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Description (Optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Premium organic cotton garments"
              className="w-full rounded-lg border border-[#e5ded2] bg-white px-4 py-2.5 text-sm text-[#10100F] focus:border-[#10100F] focus:outline-none transition-colors font-sans"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#10100F] hover:bg-neutral-800 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Category'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setError(null);
              }}
              className="rounded-full border border-[#e5ded2] bg-white hover:bg-[#f3f3f1] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#10100F] transition-all shadow-2xs active:scale-95"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Categories Table */}
      <div className="rounded-xl border border-[#e5ded2] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f3f3f1]/80 border-b border-[#e5ded2] text-xs font-bold uppercase tracking-wider text-[#10100F]/60 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Slug</th>
                <th className="py-3.5 px-5">Parent</th>
                <th className="py-3.5 px-5 text-right">Products Count</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded2]/80">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-5"><div className="h-4 w-32 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-3.5 w-24 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5"><div className="h-4 w-16 rounded-full bg-[#f3f3f1]" /></td>
                    <td className="py-3.5 px-5 text-right"><div className="h-4 w-12 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                    <td className="py-3.5 px-5 text-right"><div className="h-7 w-20 rounded-full bg-[#f3f3f1] ml-auto" /></td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-[#10100F]/60">
                    No categories defined yet.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f3f3f1]/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-sm text-[#10100F] uppercase tracking-tight block">
                        {c.name}
                      </span>
                      {c.description && <span className="text-xs text-[#10100F]/50">{c.description}</span>}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#10100F]/60">
                      /{c.slug}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#10100F]/70">
                      {c.parentCategoryId ? nameById.get(c.parentCategoryId) ?? '—' : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right text-xs font-bold text-[#10100F]">
                      {c.productCount} {c.productCount === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="rounded-full border border-[#e5ded2] bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#10100F] hover:bg-[#10100F] hover:text-white transition-all shadow-2xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
