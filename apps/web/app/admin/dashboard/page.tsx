"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminAnalyticsApi, DashboardSummaryModel } from "@/lib/api-client";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const token = getAdminToken();
        const data = await adminAnalyticsApi.getSummary(token);
        setSummary(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Store Dashboard</h1>
          <p className="text-sm text-stone-500">Real-time operational overview for Saraswati Sweets</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 shadow-sm"
          >
            Manage Orders
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[#70102D] shadow-sm"
          >
            + Add New Sweet
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-stone-200 rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Today's Orders */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 text-sm font-medium mb-2">
                <span>Today&#39;s Orders</span>
                <span className="text-lg">🛍️</span>
              </div>
              <div className="text-3xl font-bold text-stone-900">{summary.today.orders}</div>
              <p className="text-xs text-stone-500 mt-1">Confirmed &amp; placed today</p>
            </div>

            {/* Today's Revenue */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 text-sm font-medium mb-2">
                <span>Today&#39;s Revenue</span>
                <span className="text-lg">💰</span>
              </div>
              <div className="text-3xl font-bold text-emerald-700">
                ₹{summary.today.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Avg order: ₹{summary.today.average_order_value.toFixed(2)}
              </p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 text-sm font-medium mb-2">
                <span>Orders in Progress</span>
                <span className="text-lg">⏳</span>
              </div>
              <div className="text-3xl font-bold text-amber-600">{summary.pending_orders}</div>
              <p className="text-xs text-stone-500 mt-1">
                {summary.orders_awaiting_action} awaiting kitchen action
              </p>
            </div>

            {/* Active Products */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 text-sm font-medium mb-2">
                <span>Active Mithai</span>
                <span className="text-lg">🍬</span>
              </div>
              <div className="text-3xl font-bold text-stone-900">{summary.total_active_products}</div>
              <p className="text-xs text-stone-500 mt-1">Catalog items listed</p>
            </div>
          </div>

          {/* Low Stock Warning Section */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <span>⚠️</span> Low Stock &amp; Inventory Alerts
                </h2>
                <p className="text-sm text-stone-500">Products requiring immediate kitchen replenishment</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                {summary.low_stock_items.length} items
              </span>
            </div>

            {summary.low_stock_items.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <span className="text-3xl block mb-2">✨</span>
                All mithai variants and gift items are adequately stocked.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-600">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">Variant</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Quantity Left</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {summary.low_stock_items.map((item) => (
                      <tr key={item.variant_id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-stone-900">{item.product_name}</td>
                        <td className="px-6 py-4">{item.variant_label}</td>
                        <td className="px-6 py-4 font-mono text-xs">{item.sku || "—"}</td>
                        <td className="px-6 py-4 font-bold text-amber-700">
                          {item.stock_quantity !== null ? item.stock_quantity : "Low"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {item.stock_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/products`}
                            className="text-maroon-700 hover:text-maroon-900 font-medium text-xs hover:underline"
                          >
                            Update Stock →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

