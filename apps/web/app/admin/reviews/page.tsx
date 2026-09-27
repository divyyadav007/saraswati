"use client";

import { useEffect, useState } from "react";
import { reviewApi, ReviewModel } from "@/lib/api-client";
import { Star, CheckCircle2, XCircle, Trash2, AlertCircle, MessageSquare } from "lucide-react";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "PUBLISHED">("PENDING");

  const getAuthToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("auth_token") || "";
  };

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const isPub = filter === "PENDING" ? false : filter === "PUBLISHED" ? true : undefined;
      const data = await reviewApi.listAdmin(getAuthToken(), isPub);
      setReviews(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [filter]);

  const handleModerate = async (reviewId: string, isPublished: boolean) => {
    try {
      await reviewApi.moderateAdmin(reviewId, isPublished, getAuthToken());
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_published: isPublished } : r))
      );
      // Reload if filtered to ensure list remains accurate
      if (filter !== "ALL") {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update review moderation status");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer review?")) return;
    try {
      await reviewApi.deleteAdmin(reviewId, getAuthToken());
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err: any) {
      alert(err?.message || "Failed to delete review");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-stone-900 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-[#8A1538] text-xl">⭐</span>
            Review Moderation Queue
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-1">
            Gated reviews submitted by customers following delivered orders. Approve to show on storefront.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-xs text-xs font-semibold">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === "PENDING"
                ? "bg-[#8A1538] text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => setFilter("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === "PUBLISHED"
                ? "bg-[#8A1538] text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === "ALL"
                ? "bg-[#8A1538] text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            All Reviews
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-semibold text-stone-700 text-sm">
              {filter === "PENDING"
                ? "No reviews awaiting moderation"
                : "No customer reviews found"}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Reviews can only be submitted by customers after their orders have been successfully delivered.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {reviews.map((r) => (
              <div key={r.id} className="p-5 hover:bg-stone-50/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-stone-900">
                      {r.product_name || "Saraswati Sweet"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.is_published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {r.is_published ? "Published" : "Pending Moderation"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.rating ? "fill-amber-400 text-amber-400" : "text-stone-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span>•</span>
                    <span className="font-semibold text-stone-700">{r.user_name}</span>
                    <span>•</span>
                    <span className="text-stone-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}
                    </span>
                  </div>

                  {r.comment && (
                    <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 max-w-2xl italic">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!r.is_published ? (
                    <button
                      onClick={() => handleModerate(r.id, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Publish
                    </button>
                  ) : (
                    <button
                      onClick={() => handleModerate(r.id, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Unpublish
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
