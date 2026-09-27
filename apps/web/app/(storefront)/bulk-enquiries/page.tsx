"use client";

import { useState } from "react";
import Link from "next/link";
import { bulkEnquiryApi, BulkEnquiryCreateRequest } from "@/lib/api-client";
import {
  Sparkles,
  Building2,
  Heart,
  Send,
  CheckCircle2,
  Calendar,
  Users,
  Phone,
  Mail,
  FileText,
  Clock,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";

export default function BulkEnquiriesPage() {
  const [formData, setFormData] = useState<BulkEnquiryCreateRequest>({
    name: "",
    phone: "",
    email: "",
    enquiry_type: "CORPORATE",
    event_date: "",
    estimated_quantity: "",
    items_of_interest: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token") || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError("Please provide your name and contact phone number.");
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const payload: BulkEnquiryCreateRequest = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        enquiry_type: formData.enquiry_type || "BULK",
        event_date: formData.event_date || undefined,
        estimated_quantity: formData.estimated_quantity?.trim() || undefined,
        items_of_interest: formData.items_of_interest?.trim() || undefined,
        message: formData.message?.trim() || undefined,
      };

      const result = await bulkEnquiryApi.submit(payload, token);
      setEnquiryId(result.id);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit bulk enquiry. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#8A1538]/10 text-[#8A1538] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Corporate & Wedding Sweet Concierge
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight mb-4">
            Custom Bulk Mithai & Gift Hampers
          </h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            From regal wedding favors to festive corporate gifting boxes with custom corporate branding,
            our team crafts unforgettable sweet experiences for any gathering.
          </p>
        </div>

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#8A1538] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Corporate Gifting</h4>
              <p className="text-stone-500 text-xs leading-relaxed">
                Branded sleeves, custom gift cards, and tiered price discounts for 25+ boxes.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Weddings & Milestones</h4>
              <p className="text-stone-500 text-xs leading-relaxed">
                Brass tin collections, personalized mithai assortments, and coordinated dispatch.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Quick Quotations</h4>
              <p className="text-stone-500 text-xs leading-relaxed">
                Dedicated concierge manager contacts you with samples & quotation within 4 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Submission Confirmation OR Form */}
        {submitted ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center shadow-md max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
              Enquiry Received!
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mb-6 leading-relaxed">
              Thank you for considering Saraswati Sweets. Our Corporate & Event Gifting Concierge has received
              your request and will get in touch with you shortly.
            </p>

            <div className="bg-stone-50 rounded-2xl p-4 mb-8 border border-stone-200 text-xs text-stone-700 inline-block text-left">
              <div><span className="font-bold">Reference ID:</span> {enquiryId}</div>
              <div><span className="font-bold">Contact:</span> {formData.phone}</div>
              <div><span className="font-bold">Response Window:</span> Under 4 Business Hours</div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: "",
                    phone: "",
                    email: "",
                    enquiry_type: "CORPORATE",
                    event_date: "",
                    estimated_quantity: "",
                    items_of_interest: "",
                    message: "",
                  });
                }}
                className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50"
              >
                Submit Another Enquiry
              </button>
              <Link
                href="/products"
                className="px-5 py-2.5 rounded-full bg-[#8A1538] hover:bg-[#70102D] text-white text-sm font-semibold shadow-sm"
              >
                Explore Full Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-md p-6 sm:p-10">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Name and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Your Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Singhania"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Contact Phone *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email and Occasion Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="vikram@corp.com"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Occasion / Requirement Type *
                  </label>
                  <select
                    value={formData.enquiry_type}
                    onChange={(e) => setFormData({ ...formData, enquiry_type: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                  >
                    <option value="CORPORATE">Corporate Gifting & Diwali</option>
                    <option value="WEDDING">Wedding Celebration & Return Gifts</option>
                    <option value="BULK">Bulk Mithai Catering / Pooja</option>
                    <option value="OTHER">Other Custom Celebration</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Event Date and Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Event / Dispatch Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.event_date || ""}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Estimated Quantity / Guest Count
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 150 boxes or 300 guests"
                    value={formData.estimated_quantity || ""}
                    onChange={(e) => setFormData({ ...formData, estimated_quantity: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Items of Interest */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Sweets or Gift Hampers of Interest
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kaju Katli, Motichoor Ladoo, Besan Ladoo, Assorted Dry Fruit Hampers"
                  value={formData.items_of_interest || ""}
                  onChange={(e) => setFormData({ ...formData, items_of_interest: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                />
              </div>

              {/* Row 5: Notes & Message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Special Customization & Packaging Instructions
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about custom packaging (ribbon color, company logo, personalized greeting card), budget per box, or delivery logistics..."
                  value={formData.message || ""}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-stone-500">
                  🔒 We respect your privacy. No spam. Contacted only regarding this quote.
                </span>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#8A1538] hover:bg-[#70102D] text-white px-8 py-3 rounded-full font-semibold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Submitting Enquiry...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Bulk Enquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
