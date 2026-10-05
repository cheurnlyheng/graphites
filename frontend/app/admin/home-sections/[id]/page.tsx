'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { getAdminAuth, clearAdminAuth, isAdminAuthError } from '@/lib/auth';
import type { AdminHomeSectionResponse, AdminSectionProduct } from '@/lib/types';
import { BlockEditor } from '../BlockEditor';
import { EditorHeader } from '../EditorHeader';
import { TYPE_LABELS, draftFromSection, type Draft } from '../draft';

/** Its own page rather than an inline form at the top of the block list, so editing one block doesn't have
 * to keep every other block's data (and this one's full product picker) mounted at the same time. */
export default function EditHomeSectionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [options, setOptions] = useState<AdminSectionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  function onAuthError() {
    clearAdminAuth();
    router.push('/admin/login');
  }

  useEffect(() => {
    const auth = getAdminAuth();
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    apiFetch<AdminHomeSectionResponse>(`/api/admin/home-sections/${params.id}`, { token: auth.token })
      .then((section) => {
        setDraft(draftFromSection(section));
        // Only a product row or hanging rail needs the full catalog (with pictures) for its picker.
        if (section.type === 'PRODUCTS' || section.type === 'HANGING_RAIL') {
          return apiFetch<AdminSectionProduct[]>('/api/admin/home-sections/product-options', { token: auth.token }).then(
            setOptions
          );
        }
      })
      .catch((err) => {
        if (isAdminAuthError(err)) {
          onAuthError();
        } else if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFound) {
    return (
      <div className="w-full max-w-3xl space-y-6">
        <EditorHeader title="Block Not Found" />
        <p className="text-sm text-[#10100F]/60">It may have already been deleted.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] space-y-8 pb-16">
      <EditorHeader title={draft ? `Edit ${TYPE_LABELS[draft.type]}` : 'Edit Block'} />
      {loading || !draft ? (
        <div className="rounded-2xl border border-[#e5ded2] bg-white p-12 text-center text-sm font-sans text-[#10100F]/60 shadow-xs">
          Loading…
        </div>
      ) : (
        <BlockEditor
          initial={draft}
          options={options}
          onAuthError={onAuthError}
          onCancel={() => router.push('/admin/home-sections')}
          onSaved={() => router.push('/admin/home-sections')}
        />
      )}
    </div>
  );
}
