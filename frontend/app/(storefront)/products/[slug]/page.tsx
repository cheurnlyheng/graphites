import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch, mediaUrl } from '@/lib/api';
import type { ProductDetailResponse } from '@/lib/types';
import { ProductDetailClient } from './ProductDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await apiFetch<ProductDetailResponse>(`/api/products/${slug}`);
    const description = product.description
      ? product.description.slice(0, 160)
      : `${product.name} -- $${product.price.toFixed(2)} at GRAPHITES.`;
    return {
      title: `${product.name} — GRAPHITES`,
      description,
      openGraph: {
        title: product.name,
        description,
        images: product.images[0]?.url ? [mediaUrl(product.images[0].url)] : undefined
      }
    };
  } catch {
    return { title: 'Product — GRAPHITES' };
  }
}

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
