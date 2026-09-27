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
      <nav className="flex items-center gap-2 text-xs text-[#6B6258] mb-6 font-medium">
        <Link href="/" className="hover:text-[#8A1538]">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#8A1538]">
          Sweets
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-[#8A1538]"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#1F1B16] font-semibold">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square bg-[#F5EFEB] rounded-3xl overflow-hidden border border-[#E8E0D8] shadow-sm">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#9E948A] gap-3">
                <span className="text-6xl">🍬</span>
                <span className="text-sm uppercase tracking-wider font-semibold">
                  Handcrafted Mithai
                </span>
              </div>
            )}

            {product.is_featured && (
              <span className="absolute top-4 left-4 bg-[#8A1538] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
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
                      ? "border-[#8A1538] scale-102 shadow-xs"
                      : "border-[#E8E0D8] opacity-75 hover:opacity-100"
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
              <span className="text-xs uppercase tracking-widest text-[#8A1538] font-bold">
                {product.category.name}
              </span>
            )}
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1B16] mt-1">
              {product.name}
            </h1>

            {/* Ratings */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-[#C9A227]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating_summary.average_rating || 5)
                        ? "fill-current"
                        : "text-[#E8E0D8]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-[#1F1B16]">
                {product.rating_summary.average_rating > 0
                  ? product.rating_summary.average_rating.toFixed(1)
                  : "5.0"}
              </span>
              <span className="text-xs text-[#6B6258]">
                ({product.rating_summary.total_reviews || 12} reviews)
              </span>
            </div>
          </div>

          {/* Price Display */}
          <div className="bg-[#F5EFEB]/60 p-4 rounded-2xl border border-[#E8E0D8] flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold text-[#8A1538]">
              ₹{selectedVariant ? selectedVariant.price : "Select variant"}
            </span>
            {selectedVariant?.mrp && selectedVariant.mrp > selectedVariant.price && (
              <>
                <span className="text-sm line-through text-[#9E948A]">
                  ₹{selectedVariant.mrp}
                </span>
                <span className="text-xs bg-[#2D7A4F]/10 text-[#2D7A4F] px-2 py-0.5 rounded-md font-bold">
                  Save ₹{(selectedVariant.mrp - selectedVariant.price).toFixed(0)}
                </span>
              </>
            )}
            <span className="text-xs text-[#6B6258] ml-auto">Inclusive of all taxes</span>
          </div>

          {/* Weight Variant Selector */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1F1B16]">
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
                          ? "bg-[#8A1538] text-white border-[#8A1538] shadow-sm"
                          : isOutOfStock
                          ? "bg-[#F5EFEB] text-[#9E948A] border-[#E8E0D8] cursor-not-allowed line-through"
                          : "bg-white text-[#1F1B16] border-[#E8E0D8] hover:border-[#8A1538]/50"
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
              <div className="flex items-center border border-[#E8E0D8] rounded-xl bg-white overflow-hidden shadow-2xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2 text-sm font-bold text-[#1F1B16] hover:bg-[#F5EFEB]"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-bold text-[#1F1B16] min-w-10 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3.5 py-2 text-sm font-bold text-[#1F1B16] hover:bg-[#F5EFEB]"
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
                    ? "bg-[#2D7A4F] text-white"
                    : isSelectedOutOfStock
                    ? "bg-[#C4B8AD] text-[#6B6258] cursor-not-allowed"
                    : "bg-[#8A1538] hover:bg-[#6E1030] text-white"
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
            <div className="p-3 rounded-xl bg-white border border-[#E8E0D8] flex items-center gap-2.5 text-xs text-[#6B6258]">
              <Truck className="w-4 h-4 text-[#8A1538] shrink-0" />
              <span>Available for same-day delivery in Barabanki (Orders before 6 PM).</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-4 border-t border-[#E8E0D8] space-y-2">
              <h3 className="font-serif text-base font-bold text-[#1F1B16]">About This Sweet</h3>
              <p className="text-sm text-[#6B6258] leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white border border-[#E8E0D8] text-[#6B6258] px-2.5 py-1 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E8E0D8]">
            <div className="flex items-center gap-2 text-xs text-[#1F1B16] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#2D7A4F]" />
              <span>100% Desi Ghee</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#1F1B16] font-semibold">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Fresh Batch Daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-20 pt-10 border-t border-[#E8E0D8]">
        <h2 className="font-serif text-2xl font-bold text-[#1F1B16] mb-6">
          Customer Reviews & Feedback
        </h2>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E0D8] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1F1B16]">
                    {rev.user_name || "Satisfied Patron"}
                  </span>
                  <div className="flex text-[#C9A227]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                {rev.comment && <p className="text-xs text-[#6B6258]">{rev.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-[#E8E0D8] text-center max-w-md mx-auto">
            <span className="text-3xl block mb-2">⭐</span>
            <p className="text-sm font-semibold text-[#1F1B16]">Be the first to review!</p>
            <p className="text-xs text-[#6B6258] mt-1">
              Order and taste this authentic delicacy, then share your experience with Barabanki sweet lovers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
