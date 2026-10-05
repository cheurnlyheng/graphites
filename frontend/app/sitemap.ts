import type { MetadataRoute } from 'next';
import { apiFetch } from '@/lib/api';
import type { ProductSummaryResponse } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/returns-policy`, changeFrequency: 'yearly', priority: 0.3 }
  ];

  try {
    const page = await apiFetch<{ content: ProductSummaryResponse[] }>('/api/products?size=200');
    const productRoutes: MetadataRoute.Sitemap = page.content.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7
    }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    // Backend unreachable at build time -- still ship a sitemap with the static routes rather than
    // failing the whole build over it.
    return staticRoutes;
  }
}
