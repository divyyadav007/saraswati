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
    <div className="group bg-white rounded-2xl border border-[#E8E0D8] overflow-hidden hover:border-[#8A1538]/30 hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Image Container */}
        <div className="relative aspect-square bg-[#F5EFEB] overflow-hidden">
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#9E948A] gap-2">
              <span className="text-4xl">🍬</span>
              <span className="text-xs uppercase tracking-wider font-semibold">Fresh Mithai</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {product.is_featured && (
              <span className="inline-flex items-center gap-1 bg-[#8A1538] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
                <Sparkles className="w-3 h-3 text-[#C9A227]" />
                Bestseller
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-[#1F1B16]/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {product.category_name && (
            <span className="text-[11px] uppercase tracking-wider text-[#8A1538] font-bold block mb-1">
              {product.category_name}
            </span>
          )}

          <h3 className="font-serif text-lg font-bold text-[#1F1B16] group-hover:text-[#8A1538] transition-colors line-clamp-1">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>

          {product.description && (
            <p className="text-xs text-[#6B6258] mt-1.5 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Weight Chips preview */}
          {product.variants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.variants.slice(0, 3).map((v) => (
                <span
                  key={v.id}
                  className="text-[11px] bg-[#F5EFEB] text-[#6B6258] px-2 py-0.5 rounded-md font-medium"
                >
                  {v.label}
                </span>
              ))}
              {product.variants.length > 3 && (
                <span className="text-[10px] text-[#9E948A] self-center">
                  +{product.variants.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Price & CTA */}
      <div className="p-4 sm:p-5 pt-0 border-t border-[#F5EFEB] mt-2 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#6B6258] uppercase tracking-wider block font-medium">
            Starting at
          </span>
          <span className="font-serif text-lg font-bold text-[#1F1B16]">
            {product.starting_price !== null ? `₹${product.starting_price}` : "Price upon selection"}
          </span>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A1538] hover:text-[#6E1030] bg-[#8A1538]/10 hover:bg-[#8A1538]/15 px-3 py-2 rounded-xl transition-all"
        >
          View Options
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
