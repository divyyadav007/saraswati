"use client";

import { useEffect, useState } from "react";
import { couponApi, CouponModel, CouponCreateRequest } from "@/lib/api-client";
import { Tag, Plus, Check, X, Trash2, Calendar, AlertCircle } from "lucide-react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newCoupon, setNewCoupon] = useState<CouponCreateRequest>({
    code: "",
    type: "PERCENTAGE",
    value: 10,
    min_order_value: 299,
    max_discount_amount: 100,
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    valid_from: new Date().toISOString().split("T")[0] + "T00:00:00Z",
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] + "T23:59:59Z",
    is_active: true,
  });

  const getAuthToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("auth_token") || "";
  };

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await couponApi.listAdmin(getAuthToken());
      setCoupons(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await couponApi.createAdmin(
        {
          ...newCoupon,
          code: newCoupon.code.trim().toUpperCase(),
        },
        getAuthToken()
      );
      setShowCreateModal(false);
      setNewCoupon({
        code: "",
        type: "PERCENTAGE",
        value: 10,
        min_order_value: 299,
        max_discount_amount: 100,
        usage_limit_total: 100,
        usage_limit_per_user: 1,
        valid_from: new Date().toISOString().split("T")[0] + "T00:00:00Z",
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] + "T23:59:59Z",
        is_active: true,
      });
      await loadCoupons();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (coupon: CouponModel) => {
    try {
      await couponApi.updateAdmin(coupon.id, { is_active: !coupon.is_active }, getAuthToken());
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update coupon status");
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to deactivate and remove this coupon?")) return;
    try {
      await couponApi.deleteAdmin(couponId, getAuthToken());
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } catch (err: any) {
      alert(err?.message || "Failed to delete coupon");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-stone-900 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-[var(--color-primary)] text-xl">🏷️</span>
            Discounts & Coupons
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-1">
            Configure promotional percentage and flat-rate discount codes for customer checkout.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[#70102D] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create New Coupon
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading discount coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-semibold text-stone-700 text-sm">No discount coupons yet</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Create your first promotional code to reward customers during festive occasions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-xs font-semibold hover:bg-[#70102D]"
            >
              Add Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Type & Value</th>
                  <th className="py-3.5 px-4">Min Order</th>
                  <th className="py-3.5 px-4">Max Cap</th>
                  <th className="py-3.5 px-4">Usage Limits</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-[var(--color-primary)] border border-amber-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {c.type === "PERCENTAGE" ? `${c.value}% OFF` : `₹${c.value} FLAT`}
                    </td>
                    <td className="py-3 px-4 text-stone-600">₹{c.min_order_value}</td>
                    <td className="py-3 px-4 text-stone-600">
                      {c.max_discount_amount ? `₹${c.max_discount_amount}` : "No Limit"}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {c.usage_limit_per_user}/user (Total: {c.usage_limit_total ?? "∞"})
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-[11px]">
                      {new Date(c.valid_until).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-500 border border-stone-200"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-primary)]" />
                Create New Coupon
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DIWALI20"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono uppercase tracking-wider focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Type *</label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        type: e.target.value as "PERCENTAGE" | "FLAT",
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FLAT">FLAT AMOUNT (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {newCoupon.type === "PERCENTAGE" ? "Discount Percentage (%) *" : "Flat Discount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={newCoupon.type === "PERCENTAGE" ? 100 : 10000}
                    required
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Min Order Value (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newCoupon.min_order_value}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, min_order_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              {newCoupon.type === "PERCENTAGE" && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Max Discount Cap (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCoupon.max_discount_amount || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        max_discount_amount: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Leave empty for uncapped"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Usage Limit Per User</label>
                  <input
                    type="number"
                    min="1"
                    value={newCoupon.usage_limit_per_user}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, usage_limit_per_user: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Total Storewide Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={newCoupon.usage_limit_total || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        usage_limit_total: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited if empty"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={newCoupon.valid_from.split("T")[0]}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, valid_from: `${e.target.value}T00:00:00Z` })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={newCoupon.valid_until.split("T")[0]}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, valid_until: `${e.target.value}T23:59:59Z` })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[#70102D] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {creating ? "Saving..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

