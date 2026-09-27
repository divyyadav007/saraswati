"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { giftHamperApi, GiftHamperDetailModel } from "@/lib/api-client";
import { useCart } from "@/lib/cart-context";
import {
  Gift,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  Truck,
  HeartHandshake,
  Check,
  Package,
} from "lucide-react";

export default function GiftHamperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [hamper, setHamper] = useState<GiftHamperDetailModel | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    async function loadDetail() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await giftHamperApi.getBySlug(slug);
        setHamper(data);
        if (data.images && data.images.length > 0) {
          const primary = data.images.find((img) => img.is_primary);
          setSelectedImage(primary ? primary.url : data.images[0].url);
        } else if (data.primary_image_url) {
          setSelectedImage(data.primary_image_url);
        }
      } catch (err) {
        console.error("Failed to load hamper details", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!hamper) return;
    try {
      await addItem({
        item_type: "HAMPER",
        gift_hamper_id: hamper.id,
        product_name: hamper.name,
        product_slug: hamper.slug,
        variant_label: "Festive Hamper",
        unit_price: hamper.hamper_price,
        quantity: quantity,
        image_url: selectedImage || hamper.primary_image_url || null,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err: any) {
      alert(err?.message || "Failed to add to cart");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-[450px] bg-stone-200 rounded-3xl" />
          <div className="space-y-6">
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-6 bg-stone-200 rounded w-1/4" />
            <div className="h-24 bg-stone-200 rounded" />
            <div className="h-40 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!hamper) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-20 px-4 text-center">
        <Gift className="w-16 h-16 text-[#8A1538] mx-auto mb-4 stroke-[1.5]" />
        <h2 className="font-serif text-3xl font-bold text-stone-900 mb-2">Hamper Not Found</h2>
        <p className="text-stone-500 mb-6">The requested festive gift hamper could not be found or has ended.</p>
        <Link
          href="/gift-hampers"
          className="inline-flex items-center gap-2 bg-[#8A1538] text-white px-5 py-2.5 rounded-full text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Gift Hampers
        </Link>
      </div>
    );
  }

  const items = hamper.items || [];
  const images = hamper.images || [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-stone-500">
          <Link href="/" className="hover:text-stone-900">Home</Link>
          <span>/</span>
          <Link href="/gift-hampers" className="hover:text-stone-900">Gift Hampers</Link>
          <span>/</span>
          <span className="text-stone-900 font-medium truncate">{hamper.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Left Column: Visual Gallery */}
          <div>
            <div className="relative rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-md aspect-square mb-4">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={hamper.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-[#8A1538]">
                  <Gift className="w-24 h-24 mb-3 stroke-[1.2]" />
                  <span className="font-serif font-bold text-lg">Festive Gift Hamper</span>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-[#8A1538] text-[#FBE18D] font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Royal Edition
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImage === img.url
                        ? "border-[#8A1538] shadow-sm scale-105"
                        : "border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Festive Assurance Banner */}
            <div className="mt-8 bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-3 text-stone-700 text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>100% Pure Desi Ghee & Freshly Crafted Sweets</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700 text-sm">
                <Package className="w-5 h-5 text-[#8A1538] shrink-0" />
                <span>Individually Sealed & Elegant Festive Ribbon Box</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700 text-sm">
                <Truck className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Scheduled Delivery Across Lucknow & Barabanki</span>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Composition & Ordering */}
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-3 tracking-tight">
                {hamper.name}
              </h1>

              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-3xl font-extrabold text-[#8A1538]">
                  ₹{hamper.hamper_price.toFixed(2)}
                </span>
                <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
                  Inclusive of all taxes & festive gift packaging
                </span>
              </div>

              {hamper.description && (
                <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-8 bg-white p-5 rounded-2xl border border-stone-200/70">
                  {hamper.description}
                </p>
              )}

              {/* What's Inside Breakdown Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C9A227]" />
                    What&apos;s Inside this Hamper
                  </h3>
                  <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                    {items.length} {items.length === 1 ? "Delicacy" : "Delicacies"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-stone-500 italic bg-white p-4 rounded-xl border border-stone-200">
                    Constituent sweet selection crafted fresh by chef on day of dispatch.
                  </p>
                ) : (
                  <div className="bg-white rounded-2xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden shadow-xs">
                    {items.map((it, idx) => (
                      <div key={it.id || idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#8A1538]/10 text-[#8A1538] font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-stone-900 text-sm block">
                              {it.product_name || "Specialty Sweet"}
                            </span>
                            {it.variant_label && (
                              <span className="text-xs text-stone-500 font-medium">
                                Pack: {it.variant_label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-md">
                            Qty: {it.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-md">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Quantity selector */}
                <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden shrink-0 bg-stone-50">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-700 hover:bg-stone-200 transition-colors font-bold text-lg"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-stone-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-700 hover:bg-stone-200 transition-colors font-bold text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart button */}
                <button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 w-full sm:w-auto h-12 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all shadow-md ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-[#8A1538] hover:bg-[#70102D] text-white active:scale-98"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart — ₹{(hamper.hamper_price * quantity).toFixed(2)}
                    </>
                  )}
                </button>
              </div>

              {/* Corporate & bulk callout */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span className="flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-[#8A1538]" />
                  Need 15+ boxes for weddings or corporate gifting?
                </span>
                <Link
                  href="/bulk-enquiries"
                  className="font-bold text-[#8A1538] hover:underline"
                >
                  Enquire for bulk rates &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
