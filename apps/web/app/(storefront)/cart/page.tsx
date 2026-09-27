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
    <div className="min-h-screen bg-[var(--color-background)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Your Mithai Box
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Freshly made with 100% pure desi ghee & traditional recipes
        </p>

        {items.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-2xl p-12 text-center border border-[var(--color-border)] max-w-md mx-auto shadow-xs">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-3xl mb-4">
              🍬
            </div>
            <h2 className="font-serif text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Your cart is empty
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Looks like you haven&apos;t added any sweets yet. Explore our handcrafted selection.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-medium hover:bg-[#70102D] transition-colors shadow-sm"
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
              <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Truck className="w-4 h-4 text-[var(--color-primary)]" />
                    {subtotal >= 500 ? (
                      <span className="text-emerald-700">
                        🎉 Congratulations! You have unlocked Free Local Delivery
                      </span>
                    ) : (
                      <span>
                        Add sweets worth <strong className="text-[var(--color-primary)]">₹{500 - subtotal}</strong> more for Free Delivery
                      </span>
                    )}
                  </span>
                  <span className="text-[var(--color-text-muted)]">Min. ₹500</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-[var(--color-accent-gold)] to-[var(--color-primary)] transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, (subtotal / 500) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden shadow-xs">
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
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-background)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {img ? (
                          <img
                            src={img}
                            alt={name}
                            className="w-18 h-18 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                          />
                        ) : (
                          <div className="w-18 h-18 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-2xl font-bold shrink-0">
                            🍬
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/products/${slug}`}
                            className="font-serif font-bold text-base text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {name}
                          </Link>
                          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Package: <span className="font-semibold text-[var(--color-text-primary)]">{variant}</span>
                          </div>
                          <div className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                            ₹{price} <span className="text-xs text-[var(--color-text-muted)] font-normal">per box</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[var(--color-border)]">
                        {/* Stepper */}
                        <div className="flex items-center border border-[var(--color-border)] rounded-lg bg-[var(--color-background)]">
                          <button
                            onClick={() => updateQuantity(itemId, qty - 1)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-l-lg transition-colors disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[var(--color-text-primary)]">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, qty + 1)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-r-lg transition-colors disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[70px]">
                          <span className="font-serif font-bold text-[var(--color-text-primary)] text-base">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent-gold)]" />
                  <span>100% Desi Ghee Purity</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                  <Truck className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Hygienic Temperature Pack</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-gold)]" />
                  <span>Cash on Delivery Available</span>
                </div>
              </div>
            </div>

            {/* Right: Bill Summary */}
            <div className="lg:col-span-4 bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5 sticky top-24">
              <h2 className="font-serif text-lg font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Items Subtotal ({itemsCount})</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Delivery Charges (Barabanki)</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase text-xs">
                      Free
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--color-text-primary)]">₹{deliveryCharge}</span>
                  )}
                </div>

                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Packaging & Taxes</span>
                  <span className="text-emerald-700 font-semibold uppercase text-xs">
                    Included
                  </span>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex justify-between items-baseline">
                  <div>
                    <span className="font-serif font-bold text-lg text-[var(--color-text-primary)]">
                      Grand Total
                    </span>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Pay upon delivery (Cash / UPI)</p>
                  </div>
                  <span className="font-serif font-bold text-2xl text-[var(--color-primary)]">
                    ₹{total}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full py-3.5 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[#70102D] text-white font-semibold text-center flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="text-center">
                <Link
                  href="/products"
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
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

