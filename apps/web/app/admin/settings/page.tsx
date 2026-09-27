"use client";

import { useEffect, useState } from "react";
import { adminStoreSettingsApi, StoreSettingModel } from "@/lib/api-client";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettingModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  // Form states
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [addressText, setAddressText] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState("");
  const [codEnabled, setCodEnabled] = useState(true);
  const [codLimit, setCodLimit] = useState("5000");
  const [pincodesText, setPincodesText] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const token = getAdminToken();
        const data = await adminStoreSettingsApi.get(token);
        setSettings(data);
        setStoreName(data.store_name);
        setStorePhone(data.store_phone);
        setStoreEmail(data.store_email);
        setAddressText(data.address_text);
        setDeliveryCharge(String(data.delivery_charge_flat));
        setFreeDeliveryAbove(data.free_delivery_above !== null ? String(data.free_delivery_above) : "");
        setCodEnabled(data.cod_enabled);
        setCodLimit(String(data.cod_limit_amount));
        setPincodesText(data.serviceable_pincodes.join(", "));
      } catch (err: unknown) {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load store settings",
        });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage(null);
      const token = getAdminToken();

      const parsedPincodes = pincodesText
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const updated = await adminStoreSettingsApi.update(
        {
          store_name: storeName.trim(),
          store_phone: storePhone.trim(),
          store_email: storeEmail.trim(),
          address_text: addressText.trim(),
          delivery_charge_flat: parseFloat(deliveryCharge) || 0,
          free_delivery_above: freeDeliveryAbove ? parseFloat(freeDeliveryAbove) : null,
          cod_enabled: codEnabled,
          cod_limit_amount: parseFloat(codLimit) || 0,
          serviceable_pincodes: parsedPincodes,
        },
        token
      );

      setSettings(updated);
      setStatusMessage({ type: "success", text: "Store operational settings updated and logged successfully." });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings. Please verify administrative permissions.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl">
        <div className="h-8 bg-stone-200 rounded w-1/4" />
        <div className="h-96 bg-stone-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Store Settings &amp; Rules</h1>
        <p className="text-sm text-stone-500">
          Global storefront parameters, delivery constraints, and Cash on Delivery rules
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-lg text-sm border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Store Information */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            General Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Official Contact Phone</label>
              <input
                type="text"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Support Email</label>
              <input
                type="email"
                required
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Store Physical Address</label>
              <input
                type="text"
                required
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Delivery & Pincodes */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            Delivery Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Flat Delivery Fee (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[11px] text-stone-400">Default charge applied per order</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Free Delivery Above Threshold (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Leave blank for none"
                value={freeDeliveryAbove}
                onChange={(e) => setFreeDeliveryAbove(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[11px] text-stone-400">Orders exceeding this total enjoy free shipping</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Serviceable Pincodes (Comma-separated)
            </label>
            <input
              type="text"
              value={pincodesText}
              onChange={(e) => setPincodesText(e.target.value)}
              placeholder="225001, 225002, 225003"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[11px] text-stone-400">
              Only delivery addresses matching these pincodes will be allowed to place orders
            </span>
          </div>
        </div>

        {/* Payment Rules */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            Payment &amp; COD Controls
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="codEnabled"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <label htmlFor="codEnabled" className="text-sm font-medium text-stone-900 cursor-pointer">
              Enable Cash on Delivery (COD) Checkout
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Maximum COD Limit (₹)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={codLimit}
              onChange={(e) => setCodLimit(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[11px] text-stone-400 block mt-1">
              Carts exceeding this amount must pay online via Razorpay/UPI
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[#70102D] text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Store Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

