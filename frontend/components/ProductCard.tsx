import Link from 'next/link';
import Image from 'next/image';
import type { ProductSummaryResponse } from '@/lib/types';

export function ProductCard({ product }: { product: ProductSummaryResponse }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-line/40">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            width={400}
            height={533}
            unoptimized
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/30">No image</div>
        )}
        {!product.inStock && (
          <span className="badge absolute left-2 top-2 bg-white/90 text-ink/70 shadow-sm">Out of stock</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-ink transition-colors group-hover:text-accent">{product.name}</p>
        <p className="mt-0.5 text-sm text-ink/50">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  );
}
