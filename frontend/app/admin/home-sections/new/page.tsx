'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { AdminSectionProduct, HomeSectionType } from '@/lib/types';
import { BlockEditor } from '../BlockEditor';
import { EditorHeader } from '../EditorHeader';
import { TYPE_LABELS, newDraft } from '../draft';

const VALID_TYPES: HomeSectionType[] = ['PRODUCTS', 'HERO', 'SPLIT_BANNER', 'HANGING_RAIL'];
// Only these two types have a product picker, so only they need the full catalog (with pictures) loaded.
const NEEDS_PRODUCT_OPTIONS: HomeSectionType[] = ['PRODUCTS', 'HANGING_RAIL'];

/** Its own page rather than an inline form, so choosing "Add Block" doesn't have to mount the (potentially
 * large) product picker on top of the whole existing block list. */
export default function NewHomeSectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const type = VALID_TYPES.includes(typeParam as HomeSectionType) ? (typeParam as HomeSectionType) : null;

  const [options, setOptions] = useState<AdminSectionProduct[]>([]);
  const [loading, setLoading] = useState(type !== null && NEEDS_PRODUCT_OPTIONS.includes(type));

  function onAuthError() {
    clearAdminAuth();
    router.push('/admin/login');
  }

  useEffect(() => {
    if (type === null || !NEEDS_PRODUCT_OPTIONS.includes(type)) return;
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    // Only a product row needs the full catalog (with pictures) for its picker -- no need to fetch it otherwise.
    apiFetch<AdminSectionProduct[]>('/api/admin/home-sections/product-options', { token: auth.token })
      .then(setOptions)
      .catch((err) => {
        if (isAdminAuthError(err)) onAuthError();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  if (!type) {
    return (
      <div className="w-full max-w-3xl space-y-6">
        <EditorHeader title="New Block" />
        <p className="text-sm text-[#10100F]/60">
          No block type was chosen. Go back and pick one from &ldquo;Add Layout Block&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16">
      <EditorHeader title={`New ${TYPE_LABELS[type]}`} />
      {loading ? (
        <div className="rounded-2xl border border-[#e5ded2] bg-white p-12 text-center text-sm font-sans text-[#10100F]/60 shadow-xs">
          Loading…
        </div>
      ) : (
        <BlockEditor
          initial={newDraft(type)}
          options={options}
          onAuthError={onAuthError}
          onCancel={() => router.push('/admin/home-sections')}
          onSaved={() => router.push('/admin/home-sections')}
        />
      )}
    </div>
  );
}
