"use client";

import { useEffect, useState } from "react";
import { adminAnalyticsApi, SalesReportModel } from "@/lib/api-client";

export default function AdminReportsPage() {
  const [report, setReport] = useState<SalesReportModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  // Default to last 30 days
  const todayStr = new Date().toISOString().split("T")[0];
  const lastMonthDate = new Date();
  lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  const lastMonthStr = lastMonthDate.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(lastMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [groupBy, setGroupBy] = useState<"category" | "product">("category");

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      const data = await adminAnalyticsApi.getSalesReport(
        token,
        startDate,
        endDate,
        groupBy
      );
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate sales report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchReport();
  }

  function handleExportCsv() {
    const token = getAdminToken();
    const exportUrl = adminAnalyticsApi.getExportUrl(startDate, endDate, groupBy);
    // Fetch with authorization header and download blob
    fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to export CSV");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales_report_${startDate}_${endDate}_${groupBy}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(err.message || "Failed to download CSV");
      });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Sales Reports</h1>
          <p className="text-sm text-stone-500">
            Performance analytics and revenue distribution across categories and products
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 shadow-sm"
        >
          <span>📥</span> Download CSV Report
        </button>
      </div>

      {/* Filters Form */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1538]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1538]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Group By</label>
            <div className="flex rounded-lg border border-stone-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setGroupBy("category")}
                className={`px-4 py-2 font-medium ${
                  groupBy === "category" ? "bg-[#8A1538] text-white" : "bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setGroupBy("product")}
                className={`px-4 py-2 font-medium ${
                  groupBy === "product" ? "bg-[#8A1538] text-white" : "bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                Product
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-stone-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            Apply Filter
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-stone-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-stone-200 rounded-xl" />
        </div>
      ) : report ? (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-stone-500">Total Orders</span>
              <p className="text-2xl font-bold text-stone-900 mt-1">{report.summary.total_orders}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-stone-500">Units Dispatched</span>
              <p className="text-2xl font-bold text-stone-900 mt-1">{report.summary.total_units}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-stone-500">Total Net Revenue</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{report.summary.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold uppercase text-stone-500">Average Order Value</span>
              <p className="text-2xl font-bold text-stone-900 mt-1">
                ₹{report.summary.average_order_value.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-base font-serif font-bold text-stone-900">
                Revenue Breakdown by {groupBy === "category" ? "Category" : "Product"}
              </h2>
            </div>
            {report.items.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No orders recorded in this date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-stone-600">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-3">{groupBy === "category" ? "Category" : "Product"}</th>
                      <th className="px-6 py-3 text-right">Orders</th>
                      <th className="px-6 py-3 text-right">Units Sold</th>
                      <th className="px-6 py-3 text-right">Revenue (INR)</th>
                      <th className="px-6 py-3 text-right">Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {report.items.map((row) => {
                      const share =
                        report.summary.total_revenue > 0
                          ? ((row.total_revenue / report.summary.total_revenue) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr key={row.group_key} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-stone-900">{row.group_key}</td>
                          <td className="px-6 py-4 text-right">{row.total_orders}</td>
                          <td className="px-6 py-4 text-right">{row.total_units}</td>
                          <td className="px-6 py-4 text-right font-semibold text-stone-900">
                            ₹{row.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700">
                              {share}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
