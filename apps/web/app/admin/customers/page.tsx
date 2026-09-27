"use client";

import { useEffect, useState } from "react";
import {
  adminCustomersApi,
  CustomerDetailModel,
  CustomerListItemModel,
} from "@/lib/api-client";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItemModel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  // Detail Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailModel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function fetchCustomers(pageNumber = 1, searchQuery = search) {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      const res = await adminCustomersApi.list(token, searchQuery, pageNumber, 20);
      setCustomers(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers directory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchCustomers(1, search);
  }

  async function viewCustomerDetails(id: string) {
    try {
      setLoadingDetail(true);
      const token = getAdminToken();
      const detail = await adminCustomersApi.get(id, token);
      setSelectedCustomer(detail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to fetch customer details");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Customer Directory</h1>
          <p className="text-sm text-stone-500">
            Registered customers, lifetime order frequency, and spend metrics
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1538]"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-stone-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchCustomers(1, "");
              }}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <span className="text-3xl block mb-2">👥</span>
            No customers found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-50 text-xs font-semibold uppercase text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Total Orders</th>
                  <th className="px-6 py-3 text-right">Lifetime Spend</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900">
                      {c.full_name || "Guest Customer"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-stone-700">{c.phone || "—"}</td>
                    <td className="px-6 py-4 text-xs">{c.email || "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : c.role === "STAFF"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-stone-900">
                      {c.total_orders}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      ₹{c.total_spend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => viewCustomerDetails(c.id)}
                        className="text-[#8A1538] hover:text-[#70102D] font-medium text-xs hover:underline"
                      >
                        Order History →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 20 && (
          <div className="p-4 border-t border-stone-200 flex items-center justify-between text-sm text-stone-600">
            <span>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} customers
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchCustomers(page - 1)}
                className="px-3 py-1.5 border border-stone-300 rounded text-xs font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => fetchCustomers(page + 1)}
                className="px-3 py-1.5 border border-stone-300 rounded text-xs font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail & Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="relative w-screen max-w-lg bg-white shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {selectedCustomer.full_name || "Customer Record"}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  ID: <span className="font-mono">{selectedCustomer.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-xs text-stone-500">Lifetime Orders</span>
                <p className="text-xl font-bold text-stone-900">{selectedCustomer.total_orders}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-xs text-stone-500">Lifetime Spend</span>
                <p className="text-xl font-bold text-emerald-700">
                  ₹{selectedCustomer.total_spend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-stone-900">Phone:</span>{" "}
                {selectedCustomer.phone || "Not provided"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Email:</span>{" "}
                {selectedCustomer.email || "Not provided"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Account Role:</span>{" "}
                {selectedCustomer.role}
              </p>
            </div>

            {/* Recent Orders List */}
            <div className="space-y-3 pt-2">
              <h3 className="font-serif font-bold text-stone-900">Order History</h3>
              {selectedCustomer.recent_orders.length === 0 ? (
                <p className="text-sm text-stone-500">No orders placed yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {selectedCustomer.recent_orders.map((o) => (
                    <div
                      key={o.order_id}
                      className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-stone-900">{o.order_number}</p>
                        <p className="text-stone-500 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-stone-900">
                          ₹{o.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-200 text-stone-700">
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
