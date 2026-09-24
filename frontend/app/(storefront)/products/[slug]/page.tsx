import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { ProductDetailResponse } from '@/lib/types';
import { ProductDetailClient } from './ProductDetailClient';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: ProductDetailResponse | null = null;
  try {
    product = await apiFetch<ProductDetailResponse>(`/api/products/${slug}`);
  } catch {
    notFound();
  }
  return <ProductDetailClient product={product as ProductDetailResponse} />;
}
