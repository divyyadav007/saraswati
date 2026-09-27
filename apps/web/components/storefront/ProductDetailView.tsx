"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, Truck, Sparkles, Check, ShoppingBag } from "lucide-react";
import { ProductDetail, ProductVariant, ProductReview } from "@/lib/api-client";

import { useCart } from "@/lib/cart-context";

interface ProductDetailViewProps {
  product: ProductDetail;
  reviews?: ProductReview[];
}

export function ProductDetailView({ product, reviews = [] }: ProductDetailViewProps) {
  const { addItem } = useCart();
  // Sort variants by price
  const variants = product.variants.length > 0 ? product.variants : [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants[0] || null
  );

  // Images gallery
  const images = product.images.length > 0 ? product.images : [];
  const [selectedImage, setSelectedImage] = useState<string>(
    product.images.find((img) => img.is_primary)?.url ||
      product.images[0]?.url ||
      ""
  );

  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product_variant_id: selectedVariant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      variant_label: selectedVariant.label,
      unit_price: selectedVariant.price,
      quantity,
      image_url: selectedImage || null,
    });
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  const isSelectedOutOfStock =
    selectedVariant?.stock_status === "OUT_OF_STOCK" || !selectedVariant?.is_active;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6 font-medium">
        <Link href="/" className="hover:text-[var(--color-primary)]">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[var(--color-primary)]">
          Sweets
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-[var(--color-primary)]"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[var(--color-text-primary)] font-semibold">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square bg-[var(--color-surface-raised)] rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-sm">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-text-subtle)] gap-3">
                <span className="text-6xl">Ã°Å¸ÂÂ¬</span>
                <span className="text-sm uppercase tracking-wider font-semibold">
                  Handcrafted Mithai
                </span>
              </div>
            )}

            {product.is_featured && (
              <span className="absolute top-4 left-4 bg-[var(--color-primary)] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-gold)]" />
                Chef&apos;s Signature
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img.url
                      ? "border-[var(--color-primary)] scale-102 shadow-xs"
                      : "border-[var(--color-border)] opacity-75 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {product.category && (
              <span className="text-xs uppercase tracking-widest text-[var(--color-primary)] font-bold">
                {product.category.name}
              </span>
            )}
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mt-1">
              {product.name}
            </h1>

            {/* Ratings */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-[var(--color-accent-gold)]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating_summary.average_rating || 5)
                        ? "fill-current"
                        : "text-[var(--color-border)]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                {product.rating_summary.average_rating > 0
                  ? product.rating_summary.average_rating.toFixed(1)
                  : "5.0"}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                ({product.rating_summary.total_reviews || 12} reviews)
              </span>
            </div>
          </div>

          {/* Price Display */}
          <div className="bg-[var(--color-surface-raised)]/60 p-4 rounded-2xl border border-[var(--color-border)] flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold text-[var(--color-primary)]">
              ₹{selectedVariant ? selectedVariant.price : "Select variant"}
            </span>
            {selectedVariant?.mrp && selectedVariant.mrp > selectedVariant.price && (
              <>
                <span className="text-sm line-through text-[var(--color-text-subtle)]">
                  ₹{selectedVariant.mrp}
                </span>
                <span className="text-xs bg-[var(--color-success)]/10 text-[var(--color-success)] px-2 py-0.5 rounded-md font-bold">
                  Save ₹{(selectedVariant.mrp - selectedVariant.price).toFixed(0)}
                </span>
              </>
            )}
            <span className="text-xs text-[var(--color-text-muted)] ml-auto">Inclusive of all taxes</span>
          </div>

          {/* Weight Variant Selector */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Select Quantity / Packaging:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isOutOfStock = v.stock_status === "OUT_OF_STOCK" || !v.is_active;

                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={isOutOfStock}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                          : isOutOfStock
                          ? "bg-[var(--color-surface-raised)] text-[var(--color-text-subtle)] border-[var(--color-border)] cursor-not-allowed line-through"
                          : "bg-white text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      {v.label} · ₹{v.price}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper & Add to Cart */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[var(--color-border)] rounded-xl bg-white overflow-hidden shadow-2xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2 text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] min-w-10 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3.5 py-2 text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isSelectedOutOfStock}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  addedSuccess
                    ? "bg-[var(--color-success)] text-white"
                    : isSelectedOutOfStock
                    ? "bg-[var(--color-disabled)] text-[var(--color-text-muted)] cursor-not-allowed"
                    : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added to Sweet Box!
                  </>
                ) : isSelectedOutOfStock ? (
                  "Currently Unavailable"
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart · ₹{((selectedVariant?.price || 0) * quantity).toFixed(0)}
                  </>
                )}
              </button>
            </div>

            {/* Quick delivery notice */}
            <div className="p-3 rounded-xl bg-white border border-[var(--color-border)] flex items-center gap-2.5 text-xs text-[var(--color-text-muted)]">
              <Truck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span>Available for same-day delivery in Barabanki (Orders before 6 PM).</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
              <h3 className="font-serif text-base font-bold text-[var(--color-text-primary)]">About This Sweet</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] px-2.5 py-1 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
              <span>100% Desi Ghee</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] font-semibold">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-gold)]" />
              <span>Fresh Batch Daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-20 pt-10 border-t border-[var(--color-border)]">
        <h2 className="font-serif text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          Customer Reviews & Feedback
        </h2>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-[var(--color-border)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--color-text-primary)]">
                    {rev.user_name || "Satisfied Patron"}
                  </span>
                  <div className="flex text-[var(--color-accent-gold)]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                {rev.comment && <p className="text-xs text-[var(--color-text-muted)]">{rev.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-[var(--color-border)] text-center max-w-md mx-auto">
            <span className="text-3xl block mb-2">⭐</span>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Be the first to review!</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Order and taste this authentic delicacy, then share your experience with Barabanki sweet lovers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}


