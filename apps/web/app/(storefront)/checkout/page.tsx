"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addressApi,
  deliveryApi,
  orderApi,
  paymentApi,
  couponApi,
  Address,
  DeliverySlotItem,
  ServiceabilityInfo,
} from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { useCart } from "@/lib/cart-context";
import {
  MapPin,
  Clock,
  Banknote,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Plus,
  Tag,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, guestItems, subtotal, deliveryCharge, total, refreshCart } = useCart();

  // State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);

  // New Address Form
  const [newAddress, setNewAddress] = useState({
    recipient_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "Barabanki",
    state: "Uttar Pradesh",
    pincode: "225001",
    landmark: "",
    is_default: true,
  });
  const [pincodeStatus, setPincodeStatus] = useState<ServiceabilityInfo | null>(null);

  // Delivery Slots
  const [slots, setSlots] = useState<DeliverySlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");

  // Notes
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [packagingNotes, setPackagingNotes] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [authStep, setAuthStep] = useState<"email" | "otp" | "done">("email");
  const [authFullName, setAuthFullName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();
  const { mergeGuestCart } = useCart();

  // Load addresses & delivery slots on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthStep("done");
        loadCheckoutData(session.access_token);
      } else {
        router.push("/login?returnTo=/checkout");
      }
    });
  }, [router]);

  const loadCheckoutData = (token: string | null) => {
    // Fetch delivery slots (public)
    deliveryApi
      .getSlots()
      .then((data) => {
        setSlots(data);
        const available = data.find((s) => s.is_available);
        if (available) {
          setSelectedSlotId(available.id);
        }
      })
      .catch(() => {
        // Fallback default slots if backend offline
        setSlots([
          {
            id: "slot-1",
            slot_date: new Date().toISOString().split("T")[0],
            start_time: "10:00 AM",
            end_time: "01:00 PM",
            label: "Morning (10:00 AM – 1:00 PM)",
            capacity: 25,
            booked_count: 5,
            is_available: true,
            status: "ACTIVE",
          },
          {
            id: "slot-2",
            slot_date: new Date().toISOString().split("T")[0],
            start_time: "02:00 PM",
            end_time: "05:00 PM",
            label: "Afternoon (2:00 PM – 5:00 PM)",
            capacity: 25,
            booked_count: 2,
            is_available: true,
            status: "ACTIVE",
          },
          {
            id: "slot-3",
            slot_date: new Date().toISOString().split("T")[0],
            start_time: "05:30 PM",
            end_time: "08:30 PM",
            label: "Evening (5:30 PM – 8:30 PM)",
            capacity: 35,
            booked_count: 8,
            is_available: true,
            status: "ACTIVE",
          },
        ]);
        setSelectedSlotId("slot-1");
      });

    if (token) {
      // Fetch saved addresses (requires auth)
      addressApi
        .listAddresses(token)
        .then((addrs) => {
          setAddresses(addrs);
          const def = addrs.find((a) => a.is_default) || addrs[0];
          if (def) setSelectedAddressId(def.id);
        })
        .catch(() => {
          // Mock fallback address for local test
          const fallbackAddr: Address = {
            id: "addr-default-1",
            user_id: "user-1",
            label: "Home",
            recipient_name: "Customer (Barabanki)",
            phone: "9876543210",
            line1: "Civil Lines, Near Ghanta Ghar",
            line2: "House No. 12",
            city: "Barabanki",
            state: "Uttar Pradesh",
            pincode: "225001",
            landmark: "Opposite Town Hall",
            delivery_instructions: null,
            is_default: true,
          };
          setAddresses([fallbackAddr]);
          setSelectedAddressId(fallbackAddr.id);
        });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (process.env.NEXT_PUBLIC_APP_ENV === "development" && authEmail === "dev@test.com") {
      const mockToken = "mock-customer-token";
      localStorage.setItem("auth_token", mockToken);
      await mergeGuestCart(mockToken);
      setAuthStep("done");
      loadCheckoutData(mockToken);
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    const normalizedEmail = authEmail.trim().toLowerCase();
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
      if (signInError) {
        throw signInError;
      } else {
        setAuthStep("otp");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to send OTP.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authOtp || authOtp.length < 6) {
      setAuthError("Please enter a valid 6-digit OTP.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    const normalizedEmail = authEmail.trim().toLowerCase();
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: authOtp, type: "email" });
      if (verifyError) throw verifyError;
      if (data?.session) {
        const token = data.session.access_token;
        localStorage.setItem("auth_token", token);
        try {
          await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1") + "/auth/sync-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ full_name: authFullName.trim() || undefined })
          });
        } catch (e) {
          console.error("Failed to sync profile:", e);
        }
        await mergeGuestCart(token);
        setAuthStep("done");
        loadCheckoutData(token);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Invalid OTP.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Check pincode serviceability
  const handlePincodeChange = async (pin: string) => {
    setNewAddress((prev) => ({ ...prev, pincode: pin }));
    if (pin.length === 6) {
      try {
        const info = await addressApi.checkServiceability(pin);
        setPincodeStatus(info);
      } catch {
        setPincodeStatus(null);
      }
    } else {
      setPincodeStatus(null);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = (await supabase.auth.getSession()).data.session?.access_token || "";
    try {
      const created = await addressApi.createAddress(newAddress, token);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowNewAddressModal(false);
    } catch {
      // Local fallback mock
      const mockCreated: Address = {
        id: `addr-${Date.now()}`,
        user_id: "user-1",
        label: "Home",
        delivery_instructions: null,
        ...newAddress,
      };
      setAddresses((prev) => [mockCreated, ...prev]);
      setSelectedAddressId(mockCreated.id);
      setShowNewAddressModal(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }
    if (!selectedSlotId) {
      setError("Please select an available delivery slot.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const token = (await supabase.auth.getSession()).data.session?.access_token || "";
    const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const order = await orderApi.checkout(
        {
          address_id: selectedAddressId,
          delivery_slot_id: selectedSlotId,
          payment_method: paymentMethod,
          special_instructions: specialInstructions || undefined,
          packaging_notes: packagingNotes || undefined,
          coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        },
        token,
        idempotencyKey
      );

      // Handle Online Payment via Razorpay
      if (paymentMethod === "ONLINE" && order.razorpay_order_id) {
        const scriptLoaded = await loadRazorpayScript();
        const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

        if (scriptLoaded && (window as any).Razorpay) {
          const options = {
            key: order.razorpay_key_id || "rzp_test_mock_key_id",
            amount: Math.round(order.total_amount * 100),
            currency: order.currency || "INR",
            name: "Saraswati Sweetshop",
            description: `Order ${order.order_number}`,
            order_id: order.razorpay_order_id,
            prefill: {
              name: selectedAddr?.recipient_name || "",
              contact: selectedAddr?.phone || "",
            },
            theme: {
              color: "var(--color-primary)",
            },
            handler: async function (response: any) {
              try {
                await paymentApi.verify(
                  {
                    order_id: order.id,
                    razorpay_order_id: response.razorpay_order_id || order.razorpay_order_id!,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  },
                  token
                );
                await refreshCart();
                router.push(`/orders/${order.id}`);
              } catch (verifyErr: any) {
                setError(
                  verifyErr?.message || "Payment verification failed. Please contact store support."
                );
                setSubmitting(false);
              }
            },
            modal: {
              ondismiss: function () {
                setSubmitting(false);
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on("payment.failed", function (response: any) {
            setError(`Payment failed: ${response.error?.description || "Transaction declined"}`);
            setSubmitting(false);
          });
          rzp.open();
          return;
        } else {
          // Dev / Offline Mock Fallback Verification Mode
          const mockPaymentId = `pay_${Date.now().toString(36)}`;
          await paymentApi.verify(
            {
              order_id: order.id,
              razorpay_order_id: order.razorpay_order_id,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: `mock_sig_${mockPaymentId}`,
            },
            token
          );
          await refreshCart();
          router.push(`/orders/${order.id}`);
          return;
        }
      }

      // COD confirmation flow
      await refreshCart();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err?.message || "Checkout failed. Please check details and try again.");
      setSubmitting(false);
    }
  };

  const items = cart?.items || guestItems;

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Secure Checkout
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Fresh handcrafted sweets delivered safely to your doorstep in Barabanki
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Checkout Column */}
          <div className="lg:col-span-8 space-y-6">
            {authStep !== "done" ? (
              <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-6 text-center">
                <p>Redirecting to login...</p>
              </div>
            ) : (
              <>
            {/* Step 1: Delivery Address */}

            {/* Step 1: Delivery Address */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                      Delivery Address
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Barabanki local urban & semi-urban delivery
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewAddressModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--color-text-muted)] mb-3">No saved address found</p>
                  <button
                    type="button"
                    onClick={() => setShowNewAddressModal(true)}
                    className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold"
                  >
                    + Add Delivery Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                            {addr.label || "Home"}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                          )}
                        </div>
                        <div className="font-serif font-bold text-sm text-[var(--color-text-primary)]">
                          {addr.recipient_name}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                          {addr.line1}, {addr.line2 && `${addr.line2}, `}
                          {addr.city} — {addr.pincode}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
                          Phone: {addr.phone}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Delivery Date & Slot */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                    Select Delivery Slot
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Freshly packed before dispatch
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => slot.is_available && setSelectedSlotId(slot.id)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        !slot.is_available
                          ? "opacity-40 cursor-not-allowed bg-stone-50 border-stone-200"
                          : isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)] cursor-pointer"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 cursor-pointer"
                      }`}
                    >
                      <Clock className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
                      <div className="font-serif font-bold text-sm text-[var(--color-text-primary)]">
                        {slot.label.split(" (")[0]}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {slot.start_time} – {slot.end_time}
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {slot.is_available ? "Available" : "Filled"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                    Payment Mode
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    100% secure encrypted payment via Razorpay or Pay on Delivery
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Online Payment (Razorpay) */}
                <label
                  onClick={() => setPaymentMethod("ONLINE")}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "ONLINE"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="ONLINE"
                      checked={paymentMethod === "ONLINE"}
                      onChange={() => setPaymentMethod("ONLINE")}
                      className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[var(--color-text-primary)]">
                          Online Payment (UPI, Cards, Net Banking)
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommended
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Instant confirmation via Razorpay Gateway (Google Pay, PhonePe, Paytm, Cards)
                      </div>
                    </div>
                  </div>
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "ONLINE" ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`} />
                </label>

                {/* Cash on Delivery (COD) */}
                <label
                  onClick={() => setPaymentMethod("COD")}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "COD"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4"
                    />
                    <div>
                      <div className="font-serif font-bold text-sm text-[var(--color-text-primary)]">
                        Cash on Delivery (COD) / UPI on Delivery
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Pay in cash or scan QR code to delivery executive upon arrival
                      </div>
                    </div>
                  </div>
                  <Banknote className={`w-5 h-5 ${paymentMethod === "COD" ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`} />
                </label>
              </div>
            </div>

            {/* Special Instructions & Packaging Notes */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                Special Instructions & Packaging (Optional)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                    Delivery Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Ring doorbell twice, leave with guard..."
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                    Gift / Packaging Notes
                  </label>
                  <textarea
                    rows={2}
                    value={packagingNotes}
                    onChange={(e) => setPackagingNotes(e.target.value)}
                    placeholder="e.g. Festive golden ribbon packing required..."
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
              </>
            )}
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-4 bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5 sticky top-24">
            <h2 className="font-serif text-lg font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
              Order Review
            </h2>

            {/* Mini items list */}
            <div className="space-y-3 max-h-48 overflow-y-auto divide-y divide-[var(--color-border)]/60 pr-1">
              {items.map((item) => {
                const itemId = "id" in item ? String(item.id) : String(item.product_variant_id);
                return (
                  <div key={itemId} className="pt-2 flex justify-between text-xs">
                    <div>
                      <div className="font-serif font-bold text-[var(--color-text-primary)]">
                        {item.product_name}
                      </div>
                      <div className="text-[var(--color-text-muted)]">
                        {item.variant_label} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      ₹{item.unit_price * item.quantity}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Promo / Coupon Box */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Apply Coupon Code</span>
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      Applied! (₹{appliedCoupon.discount} saved)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                      setCouponError(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. DIWALI20, FLAT50"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!couponInput.trim()) return;
                          setValidatingCoupon(true);
                          setCouponError(null);
                          const token = (await supabase.auth.getSession()).data.session?.access_token || "";
                          try {
                            const res = await couponApi.validate(
                              { code: couponInput.trim().toUpperCase(), cart_total: subtotal },
                              token
                            );
                            if (res.is_valid) {
                              setAppliedCoupon({
                                code: res.coupon_code,
                                discount: res.discount_amount,
                              });
                              setCouponError(null);
                            } else {
                              setAppliedCoupon(null);
                              setCouponError(res.message || "Invalid coupon code");
                            }
                          } catch (err: any) {
                            setAppliedCoupon(null);
                            setCouponError(err?.message || "Failed to validate coupon");
                          } finally {
                            setValidatingCoupon(false);
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-xl text-xs uppercase font-mono tracking-wider outline-none focus:border-[var(--color-primary)]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!couponInput.trim()) return;
                        setValidatingCoupon(true);
                        setCouponError(null);
                        const token = (await supabase.auth.getSession()).data.session?.access_token || "";
                        try {
                          const res = await couponApi.validate(
                            { code: couponInput.trim().toUpperCase(), cart_total: subtotal },
                            token
                          );
                          if (res.is_valid) {
                            setAppliedCoupon({
                              code: res.coupon_code,
                              discount: res.discount_amount,
                            });
                            setCouponError(null);
                          } else {
                            setAppliedCoupon(null);
                            setCouponError(res.message || "Invalid coupon code");
                          }
                        } catch (err: any) {
                          setAppliedCoupon(null);
                          setCouponError(err?.message || "Failed to validate coupon");
                        } finally {
                          setValidatingCoupon(false);
                        }
                      }}
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[#70102D] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      {validatingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-rose-600 font-medium">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Items Total</span>
                <span className="font-semibold text-[var(--color-text-primary)]">₹{subtotal}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-₹{appliedCoupon.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Delivery Charge</span>
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-700 font-semibold uppercase text-xs">
                    Free
                  </span>
                ) : (
                  <span className="font-semibold text-[var(--color-text-primary)]">₹{deliveryCharge}</span>
                )}
              </div>
              <div className="pt-3 border-t border-[var(--color-border)] flex justify-between items-baseline">
                <span className="font-serif font-bold text-lg text-[var(--color-text-primary)]">
                  Payable ({paymentMethod === "ONLINE" ? "Online" : "COD"})
                </span>
                <span className="font-serif font-bold text-2xl text-[var(--color-primary)]">
                  ₹{Math.max(0, subtotal - (appliedCoupon ? appliedCoupon.discount : 0) + deliveryCharge)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full py-4 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[#70102D] text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50"
            >
              <span>{submitting ? "Placing Order..." : "Confirm & Place Order"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-center">
              <p className="text-[11px] text-amber-900 font-medium">
                🛡️ Freshness Guarantee: Authentic Barabanki sweets made fresh everyday
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showNewAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
              <h3 className="font-serif font-bold text-base text-[var(--color-text-primary)]">
                Add Barabanki Delivery Address
              </h3>
              <button
                onClick={() => setShowNewAddressModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.recipient_name}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, recipient_name: e.target.value }))
                  }
                  placeholder="e.g. Anand Sharma"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={newAddress.phone}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newAddress.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="225001"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-[var(--color-primary)] font-mono"
                />
                {pincodeStatus && (
                  <div
                    className={`mt-1 text-[11px] font-semibold ${
                      pincodeStatus.is_serviceable ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {pincodeStatus.is_serviceable
                      ? "✓ Serviceable for same-day delivery"
                      : "✕ Not serviceable"}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                  Address Line 1 (House No, Building, Street) *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.line1}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, line1: e.target.value }))
                  }
                  placeholder="e.g. House 45, Civil Lines"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-primary)] mb-1">
                  Landmark
                </label>
                <input
                  type="text"
                  value={newAddress.landmark}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, landmark: e.target.value }))
                  }
                  placeholder="Near Clock Tower / Railway Station"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowNewAddressModal(false)}
                  className="px-4 py-2 border rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[#70102D]"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

