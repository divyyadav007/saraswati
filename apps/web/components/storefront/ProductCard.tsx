import Link from "next/link";
import { ProductListItem } from "@/lib/api-client";
import { ArrowRight, Sparkles } from "lucide-react";

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock =
    product.variants.length > 0 &&
    product.variants.every((v) => v.stock_status === "OUT_OF_STOCK" || !v.is_active);

  return (
    <article className="group bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-border-strong)] hover:shadow-md shadow-sm transition-all duration-300 flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative aspect-square bg-[var(--color-surface-raised)] overflow-hidden">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-text-subtle)] gap-2">
            <span className="text-4xl" aria-hidden="true">🍬</span>
            <span className="text-xs uppercase tracking-wider font-semibold">Fresh Mithai</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {product.is_featured && !isOutOfStock && (
            <span className="inline-flex items-center gap-1 bg-[var(--color-primary)] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              <Sparkles className="w-3 h-3 text-[var(--color-accent-gold)]" aria-hidden="true" />
              Bestseller
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-[var(--color-text-primary)]/80 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              Sold Out
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {product.category_name && (
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-primary)] font-bold block mb-1">
            {product.category_name}
          </span>
        )}

        <h3 className="font-serif text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>

        {product.description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2 leading-relaxed flex-1">
            {product.description}
          </p>
        )}

        {/* Weight Chips preview */}
        {product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.variants.slice(0, 3).map((v) => (
              <span
                key={v.id}
                className="text-[11px] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md font-medium border border-[var(--color-border)]"
              >
                {v.label}
              </span>
            ))}
            {product.variants.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-subtle)] self-center">
                +{product.variants.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer / Price & CTA */}
      <div className="p-4 sm:p-5 pt-3 flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block font-medium mb-0.5">
            Starting at
          </span>
          <span className="font-serif text-xl font-bold text-[var(--color-primary)]">
            {product.starting_price !== null ? `₹${product.starting_price}` : "Price upon selection"}
          </span>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-4 py-2.5 rounded-xl transition-all uppercase tracking-wide"
          aria-label={`View options for ${product.name}`}
        >
          View Options
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
