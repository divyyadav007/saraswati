"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";

export default function CartPage() {
  const {
    cart,
    guestItems,
    itemsCount,
    subtotal,
    deliveryCharge,
    total,
    updateQuantity,
    removeItem,
    isLoading,
  } = useCart();

  // Combine items representation
  const items = cart?.items || guestItems;

  return (
    <div className="min-h-screen bg-[#FBF7F2] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-[#1F1B16] mb-2">
          Your Mithai Box
        </h1>
        <p className="text-sm text-[#6B6258] mb-8">
          Freshly made with 100% pure desi ghee & traditional recipes
        </p>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E8E0D8] max-w-md mx-auto shadow-xs">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center text-3xl mb-4">
              🍬
            </div>
            <h2 className="font-serif text-xl font-bold text-[#1F1B16] mb-2">
              Your cart is empty
            </h2>
            <p className="text-sm text-[#6B6258] mb-6">
              Looks like you haven&apos;t added any sweets yet. Explore our handcrafted selection.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8A1538] text-white font-medium hover:bg-[#70102D] transition-colors shadow-sm"
            >
              <span>Explore Sweets</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Free delivery progress bar */}
              <div className="bg-white p-4 rounded-xl border border-[#E8E0D8] shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5 text-[#1F1B16]">
                    <Truck className="w-4 h-4 text-[#8A1538]" />
                    {subtotal >= 500 ? (
                      <span className="text-emerald-700">
                        🎉 Congratulations! You have unlocked Free Local Delivery
                      </span>
                    ) : (
                      <span>
                        Add sweets worth <strong className="text-[#8A1538]">₹{500 - subtotal}</strong> more for Free Delivery
                      </span>
                    )}
                  </span>
                  <span className="text-[#6B6258]">Min. ₹500</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E8E0D8] overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-[#C9A227] to-[#8A1538] transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, (subtotal / 500) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-[#E8E0D8] divide-y divide-[#E8E0D8] overflow-hidden shadow-xs">
                {items.map((item) => {
                  const itemId = "id" in item ? String(item.id) : String(item.product_variant_id);
                  const name = item.product_name;
                  const slug = item.product_slug;
                  const variant = item.variant_label;
                  const price = item.unit_price;
                  const qty = item.quantity;
                  const lineTotal = price * qty;
                  const img = item.image_url;

                  return (
                    <div
                      key={itemId}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF7F2]/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {img ? (
                          <img
                            src={img}
                            alt={name}
                            className="w-18 h-18 rounded-xl object-cover border border-[#E8E0D8] shrink-0"
                          />
                        ) : (
                          <div className="w-18 h-18 rounded-xl bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center text-2xl font-bold shrink-0">
                            🍬
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/products/${slug}`}
                            className="font-serif font-bold text-base text-[#1F1B16] hover:text-[#8A1538] transition-colors"
                          >
                            {name}
                          </Link>
                          <div className="text-xs text-[#6B6258] mt-0.5">
                            Package: <span className="font-semibold text-[#1F1B16]">{variant}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#8A1538] mt-1">
                            ₹{price} <span className="text-xs text-[#6B6258] font-normal">per box</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#E8E0D8]">
                        {/* Stepper */}
                        <div className="flex items-center border border-[#E8E0D8] rounded-lg bg-[#FBF7F2]">
                          <button
                            onClick={() => updateQuantity(itemId, qty - 1)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-white text-[#1F1B16] rounded-l-lg transition-colors disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[#1F1B16]">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, qty + 1)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-white text-[#1F1B16] rounded-r-lg transition-colors disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[70px]">
                          <span className="font-serif font-bold text-[#1F1B16] text-base">
                            ₹{lineTotal}
                          </span>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(itemId)}
                          disabled={isLoading}
                          className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-[#6B6258]">
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E8E0D8]">
                  <Sparkles className="w-4 h-4 text-[#C9A227]" />
                  <span>100% Desi Ghee Purity</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E8E0D8]">
                  <Truck className="w-4 h-4 text-[#8A1538]" />
                  <span>Hygienic Temperature Pack</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E8E0D8]">
                  <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                  <span>Cash on Delivery Available</span>
                </div>
              </div>
            </div>

            {/* Right: Bill Summary */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E8E0D8] shadow-xs space-y-5 sticky top-24">
              <h2 className="font-serif text-lg font-bold text-[#1F1B16] border-b border-[#E8E0D8] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#6B6258]">
                  <span>Items Subtotal ({itemsCount})</span>
                  <span className="font-semibold text-[#1F1B16]">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-[#6B6258]">
                  <span>Delivery Charges (Barabanki)</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase text-xs">
                      Free
                    </span>
                  ) : (
                    <span className="font-semibold text-[#1F1B16]">₹{deliveryCharge}</span>
                  )}
                </div>

                <div className="flex justify-between text-[#6B6258]">
                  <span>Packaging & Taxes</span>
                  <span className="text-emerald-700 font-semibold uppercase text-xs">
                    Included
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E8E0D8] flex justify-between items-baseline">
                  <div>
                    <span className="font-serif font-bold text-lg text-[#1F1B16]">
                      Grand Total
                    </span>
                    <p className="text-[11px] text-[#6B6258]">Pay upon delivery (Cash / UPI)</p>
                  </div>
                  <span className="font-serif font-bold text-2xl text-[#8A1538]">
                    ₹{total}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full py-3.5 px-6 rounded-xl bg-[#8A1538] hover:bg-[#70102D] text-white font-semibold text-center flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="text-center">
                <Link
                  href="/products"
                  className="text-xs font-semibold text-[#8A1538] hover:underline"
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
