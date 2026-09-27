"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { giftHamperApi, GiftHamperModel } from "@/lib/api-client";
import { useCart } from "@/lib/cart-context";
import { Gift, Sparkles, ShoppingBag, ArrowRight, Check } from "lucide-react";

export default function GiftHampersPage() {
  const [hampers, setHampers] = useState<GiftHamperModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const { addItem } = useCart();

  useEffect(() => {
    async function loadHampers() {
      try {
        setLoading(true);
        const data = await giftHamperApi.list(1, 50);
        setHampers(data.items.filter((h) => h.is_active));
      } catch (err) {
        console.error("Failed to load gift hampers", err);
      } finally {
        setLoading(false);
      }
    }
    loadHampers();
  }, []);

  const handleAddToCart = async (hamper: GiftHamperModel) => {
    try {
      await addItem({
        item_type: "HAMPER",
        gift_hamper_id: hamper.id,
        product_name: hamper.name,
        product_slug: hamper.slug,
        variant_label: "Festive Hamper",
        unit_price: hamper.hamper_price,
        quantity: 1,
        image_url: hamper.primary_image_url || "/images/hamper-placeholder.jpg",
      });
      setAddedIds((prev) => ({ ...prev, [hamper.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [hamper.id]: false }));
      }, 2000);
    } catch (err: any) {
      alert(err?.message || "Failed to add hamper to cart");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-primary)] via-[#70102D] to-[#4A0A1D] text-white p-8 sm:p-12 mb-12 shadow-xl border border-rose-900/40">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)]/40 text-[#FBE18D] text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Festive Gifting 2026
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Royal Festive Hampers & Mithai Boxes
            </h1>
            <p className="text-rose-100/90 text-sm sm:text-base leading-relaxed mb-6">
              Celebrate weddings, Diwali, and auspicious occasions with hand-curated collections of
              pure desi ghee sweets, premium dry fruits, and regal presentation boxes.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/bulk-enquiries"
                className="inline-flex items-center gap-2 bg-[var(--color-accent-gold)] hover:bg-[#B38F1E] text-stone-950 font-semibold px-5 py-2.5 rounded-full text-sm transition-all shadow-md"
              >
                Bulk & Corporate Orders
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-[200px] pointer-events-none select-none">
            🎁
          </div>
        </div>

        {/* Hampers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-[var(--color-surface)] rounded-2xl h-96 p-4 animate-pulse border border-stone-200 flex flex-col justify-between"
              >
                <div className="h-52 bg-stone-200 rounded-xl mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-4 bg-stone-200 rounded w-1/2" />
                </div>
                <div className="h-10 bg-stone-200 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : hampers.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-stone-200 shadow-sm max-w-lg mx-auto">
            <Gift className="w-16 h-16 text-[var(--color-primary)] mx-auto mb-4 stroke-[1.5]" />
            <h3 className="font-serif text-2xl font-bold text-stone-800 mb-2">No Hampers Available</h3>
            <p className="text-stone-500 text-sm mb-6">
              Our master confectioners are creating new festive collections. Please check back soon or submit a custom bulk enquiry.
            </p>
            <Link
              href="/bulk-enquiries"
              className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[#70102D] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
            >
              Request Custom Hamper
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {hampers.map((hamper) => {
              const isAdded = !!addedIds[hamper.id];
              return (
                <div
                  key={hamper.id}
                  className="bg-[var(--color-surface)] rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Image container */}
                  <Link href={`/gift-hampers/${hamper.slug}`} className="relative h-64 bg-stone-100 overflow-hidden block">
                    {hamper.primary_image_url ? (
                      <img
                        src={hamper.primary_image_url}
                        alt={hamper.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50/50 text-[var(--color-primary)]">
                        <Gift className="w-14 h-14 mb-2 stroke-[1.5]" />
                        <span className="text-xs uppercase tracking-wider font-semibold">Festive Hamper</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-[var(--color-accent-gold)] text-stone-950 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Festive Special
                    </span>
                  </Link>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <Link href={`/gift-hampers/${hamper.slug}`} className="block">
                        <h3 className="font-serif font-bold text-xl text-stone-900 group-hover:text-[var(--color-primary)] transition-colors line-clamp-1 mb-1.5">
                          {hamper.name}
                        </h3>
                      </Link>
                      <p className="text-stone-600 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                        {hamper.description || "Grand festive assortment of pure desi ghee mithai and dry fruits."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-stone-500 block font-medium">Price</span>
                        <span className="text-xl font-bold text-stone-900">
                          ₹{hamper.hamper_price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/gift-hampers/${hamper.slug}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleAddToCart(hamper)}
                          disabled={isAdded}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                            isAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-[var(--color-primary)] hover:bg-[#70102D] text-white"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Added
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

