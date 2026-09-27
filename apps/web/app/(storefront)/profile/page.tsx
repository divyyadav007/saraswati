"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  notificationPreferencesApi,
  userProfileApi,
  UserProfileModel,
} from "@/lib/api-client";

export default function CustomerProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfileModel | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [promotionalOptIn, setPromotionalOptIn] = useState(true);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getCustomerToken = () => {
    if (typeof window === "undefined") return "mock-customer-token";
    return localStorage.getItem("auth_token") || "mock-customer-token";
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const token = getCustomerToken();
        const [profileRes, prefRes] = await Promise.all([
          userProfileApi.get(token),
          notificationPreferencesApi.get(token),
        ]);
        const p = profileRes.data;
        setProfile(p);
        setFullName(p.full_name || "");
        setEmail(p.email || "");
        setPromotionalOptIn(prefRes.notif_promotional_opt_in);
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load account profile",
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setFeedback(null);
      const token = getCustomerToken();
      const res = await userProfileApi.update(
        { full_name: fullName.trim(), email: email.trim() || undefined },
        token
      );
      setProfile(res.data);
      setFeedback({ type: "success", message: "Personal profile updated successfully." });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update profile",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggleNotifications(optIn: boolean) {
    try {
      setSavingPref(true);
      setFeedback(null);
      const token = getCustomerToken();
      await notificationPreferencesApi.update(optIn, token);
      setPromotionalOptIn(optIn);
      setFeedback({
        type: "success",
        message: optIn
          ? "Opted into festive sweet deals & discount alerts."
          : "Unsubscribed from promotional announcements.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update notification settings",
      });
    } finally {
      setSavingPref(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-8 bg-stone-200 rounded w-1/3" />
        <div className="h-64 bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">My Account</h1>
          <p className="text-sm text-stone-600">
            Manage your personal profile, notification alerts, and order history
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center px-4 py-2 bg-stone-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          View My Orders →
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Personal Info Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
          Personal Information
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1538]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1538]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
              Registered Phone Number
            </label>
            <input
              type="text"
              disabled
              value={profile?.phone || "Verified via OTP"}
              className="w-full sm:max-w-xs px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-lg text-sm font-mono text-stone-600 cursor-not-allowed"
            />
            <span className="text-[11px] text-stone-400 block mt-1">
              Primary mobile number is bound to verified authentication identity
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-[#8A1538] hover:bg-[#70102D] text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
          Notification Preferences
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-stone-900 text-sm">Festive Offers &amp; Sweet Alerts</p>
            <p className="text-xs text-stone-500 mt-1">
              Receive updates on seasonal specials, Diwali/Holi hampers, and exclusive coupon codes.
              Transactional order and delivery tracking updates are always sent.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={promotionalOptIn}
              disabled={savingPref}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8A1538]"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
