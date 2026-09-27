"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { orderApi, reviewApi, OrderModel } from "@/lib/api-client";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Truck,
  ArrowRight,
  Phone,
  Star,
} from "lucide-react";

interface OrderTrackingProps {
  params: Promise<{ id: string }>;
}

const ORDER_STEPS = [
  { key: "PLACED", label: "Order Placed", desc: "Received at sweetshop" },
  { key: "CONFIRMED", label: "Confirmed", desc: "Ingredients prepped" },
  { key: "PREPARING", label: "In Kitchen", desc: "Fresh packing with pure desi ghee" },
  { key: "READY_FOR_PICKUP", label: "Packed & Sealed", desc: "Ready with courier" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "On the way in Barabanki" },
  { key: "DELIVERED", label: "Delivered", desc: "Enjoy your mithai!" },
];

export default function OrderTrackingPage({ params }: OrderTrackingProps) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderModel | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalItem, setReviewModalItem] = useState<{
    variantId: string;
    name: string;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
    orderApi
      .getOrderById(id, token)
      .then((data) => setOrder(data))
      .catch(() => {
        // Fallback demo order snapshot
        setOrder({
          id,
          order_number: id.startsWith("SB-") ? id : `SB-20260927-${id.slice(-4)}`,
          user_id: "u1",
          status: "PLACED",
          payment_method: "COD",
          payment_status: "COD_PENDING",
          subtotal: 580.0,
          discount_amount: 0.0,
          delivery_charge: 0.0,
          tax_amount: 0.0,
          total_amount: 580.0,
          address_snapshot: {
            recipient_name: "Customer",
            phone: "+91 94150 12345",
            line1: "Civil Lines, Near Clock Tower",
            city: "Barabanki",
            state: "Uttar Pradesh",
            pincode: "225001",
          },
          delivery_slot: {
            id: "s1",
            slot_date: "Today",
            start_time: "10:00 AM",
            end_time: "01:00 PM",
            label: "Morning (10:00 AM – 1:00 PM)",
          },
          special_instructions: "Please ring bell twice",
          packaging_notes: "Festive golden ribbon pack",
          placed_at: new Date().toISOString(),
          confirmed_at: null,
          preparing_at: null,
          ready_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          cancelled_at: null,
          cancel_reason: null,
          items: [
            {
              id: "item-1",
              item_type: "PRODUCT",
              product_variant_id: "v1",
              product_name_snapshot: "Desi Ghee Motichoor Laddu",
              variant_label_snapshot: "1kg",
              unit_price: 580.0,
              quantity: 1,
              line_total: 580.0,
            },
          ],
          created_at: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] py-20 text-center text-[var(--color-text-muted)]">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] py-20 text-center">
        <h1 className="font-serif text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Order Not Found
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          We could not locate details for this order.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  const currentStepIdx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Success Header Card */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-6 sm:p-8 border border-[var(--color-border)] shadow-xs text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              order.status === "DELIVERED"
                ? "bg-emerald-100 text-emerald-800"
                : isCancelled
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {order.status === "DELIVERED" ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : order.status === "OUT_FOR_DELIVERY" ? (
              <Truck className="w-8 h-8 text-[var(--color-primary)]" />
            ) : (
              <Package className="w-8 h-8 text-[var(--color-primary)]" />
            )}
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--color-accent-gold)]">
            {order.status === "DELIVERED"
              ? "Completed"
              : isCancelled
              ? "Cancelled"
              : "Status: " + order.status.replace(/_/g, " ")}
          </span>
          <h1 className="font-serif text-3xl font-bold text-[var(--color-text-primary)] mt-1 mb-2">
            Order #{order.order_number}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            {order.status === "DELIVERED"
              ? "Delivered successfully! We hope you enjoy the authentic taste of Barabanki sweets."
              : order.status === "OUT_FOR_DELIVERY"
              ? "Your mithai package is out for delivery with our rider and will arrive shortly."
              : isCancelled
              ? "This order was cancelled."
              : "Thank you! Your order is active and our master halwais are preparing fresh mithai for you."}
          </p>
        </div>

        {/* Order Status Timeline */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-6 sm:p-8 border border-[var(--color-border)] shadow-xs space-y-6">
          <h2 className="font-serif text-lg font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
            Live Order Status
          </h2>

          {isCancelled ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <strong className="font-bold">Order Cancelled:</strong>{" "}
              {order.cancel_reason || "Cancelled by store"}
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-border)]">
              {ORDER_STEPS.map((step, idx) => {
                const isCompleted = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? "bg-[var(--color-primary)] text-white shadow-xs"
                          : "bg-[var(--color-surface)] border-2 border-stone-300 text-stone-400"
                      }`}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div
                        className={`font-serif font-bold text-sm ${
                          isCurrent
                            ? "text-[var(--color-primary)]"
                            : isCompleted
                            ? "text-[var(--color-text-primary)]"
                            : "text-stone-400"
                        }`}
                      >
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                            In Progress
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assigned Delivery Rider Card (when assigned) */}
        {order.delivery_assignment && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border-2 border-emerald-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[var(--color-primary)]" />
                Assigned Delivery Rider
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {order.status === "DELIVERED"
                  ? "Delivered"
                  : order.status === "OUT_FOR_DELIVERY"
                  ? "Out for Delivery"
                  : "Assigned for Dispatch"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="space-y-1">
                <div className="font-bold text-base text-stone-900">
                  {order.delivery_assignment.partner_name || "Saraswati Express Rider"}
                </div>
                {order.delivery_assignment.partner_vehicle_number && (
                  <div className="text-xs text-stone-600 font-mono">
                    Vehicle: {order.delivery_assignment.partner_vehicle_number}
                  </div>
                )}
                <div className="text-[11px] text-stone-500">
                  Dispatched from: Saraswati Sweetshop, Barabanki
                </div>
              </div>

              {order.delivery_assignment.partner_phone && (
                <div>
                  <a
                    href={`tel:${order.delivery_assignment.partner_phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[#70102D] shadow-xs transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Rider ({order.delivery_assignment.partner_phone})
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery & Contact info */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
              Delivery Destination
            </h3>
            <div className="text-xs text-[var(--color-text-muted)] space-y-1">
              <div className="font-bold text-sm text-[var(--color-text-primary)]">
                {order.address_snapshot.recipient_name}
              </div>
              <div>{order.address_snapshot.line1}</div>
              <div>
                {order.address_snapshot.city} — {order.address_snapshot.pincode}
              </div>
              <div className="font-mono text-[var(--color-text-primary)] pt-1">
                Phone: {order.address_snapshot.phone}
              </div>
            </div>

            {order.delivery_slot && (
              <div className="pt-3 border-t border-[var(--color-border)]">
                <div className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  Delivery Time Slot
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {order.delivery_slot.label}
                </div>
              </div>
            )}
          </div>

          {/* Items & Payment summary */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-primary)]" />
              Items Ordered
            </h3>

            <div className="divide-y divide-[var(--color-border)]/60 text-xs">
              {order.items.map((i) => (
                <div key={i.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {i.product_name_snapshot}
                    </span>
                    <span className="text-[var(--color-text-muted)] block">
                      {i.variant_label_snapshot} × {i.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.status === "DELIVERED" && i.product_variant_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalItem({
                            variantId: i.product_variant_id!,
                            name: i.product_name_snapshot,
                          });
                          setRating(5);
                          setComment("");
                          setReviewMessage(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[var(--color-primary)] text-[11px] font-bold border border-amber-200 transition-colors"
                      >
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>Review</span>
                      </button>
                    )}
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      ₹{i.line_total}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] space-y-1.5 text-xs text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>{order.delivery_charge === 0 ? "FREE" : `₹${order.delivery_charge}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[var(--color-text-primary)] pt-1">
                <span>Total Amount ({order.payment_method})</span>
                <span className="text-[var(--color-primary)]">₹{order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <Link
            href="/products"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            ← Continue Browsing Sweets
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[#70102D] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Review Submission Modal */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Verified Purchase Review
                </span>
                <h3 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                  {reviewModalItem.name}
                </h3>
              </div>
              <button
                onClick={() => setReviewModalItem(null)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reviewMessage ? (
              <div className="space-y-4 py-3 text-center">
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    reviewMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {reviewMessage.text}
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalItem(null)}
                  className="px-5 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:bg-[#70102D]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingReview(true);
                  setReviewMessage(null);
                  const token =
                    typeof window !== "undefined"
                      ? localStorage.getItem("auth_token") || ""
                      : "";
                  try {
                    await reviewApi.submit(
                      {
                        order_id: id,
                        product_variant_id: reviewModalItem.variantId,
                        rating,
                        comment: comment.trim() || undefined,
                      },
                      token
                    );
                    setReviewMessage({
                      type: "success",
                      text: "Thank you! Your review was submitted and will appear on the store once approved by our moderation team.",
                    });
                  } catch (err: any) {
                    setReviewMessage({
                      type: "error",
                      text: err?.message || "Failed to submit review.",
                    });
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-[var(--color-text-primary)] mb-2">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-stone-700">
                      {rating} out of 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                    Your Experience (Optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about the taste, texture, sweetness, or packaging..."
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 py-2 border rounded-xl text-stone-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[#70102D] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

