"use client";

import { useEffect, useState } from "react";
import {
  bulkEnquiryApi,
  BulkEnquiryModel,
} from "@/lib/api-client";
import {
  ClipboardList,
  Phone,
  Mail,
  Calendar,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  Trash2,
  Save,
  Filter,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Leads" },
  { value: "NEW", label: "New Leads", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "CONTACTED", label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "QUOTED", label: "Quoted", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "WON", label: "Won (Confirmed)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "LOST", label: "Lost / Closed", color: "bg-stone-100 text-stone-600 border-stone-200" },
];

export default function AdminBulkEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<BulkEnquiryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus;
      const data = await bulkEnquiryApi.adminList(token, statusParam, 1, 100);
      setEnquiries(data.items);

      // Initialize notes state
      const initialNotes: Record<string, string> = {};
      data.items.forEach((item) => {
        initialNotes[item.id] = item.admin_notes || "";
      });
      setEditingNotes(initialNotes);
    } catch (err) {
      console.error("Failed to load enquiries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [selectedStatus]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const token = getAdminToken();
      await bulkEnquiryApi.adminUpdate(id, { status: newStatus }, token);
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus as any } : e))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      setSavingNoteId(id);
      const token = getAdminToken();
      const note = editingNotes[id] || "";
      await bulkEnquiryApi.adminUpdate(id, { admin_notes: note }, token);
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, admin_notes: note } : e))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to save internal notes");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      const token = getAdminToken();
      await bulkEnquiryApi.adminDelete(id, token);
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete enquiry");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#8A1538]" />
            Bulk Orders & Corporate Leads CRM
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Track incoming wedding and corporate gifting inquiries, manage lead status progression, and store internal sales notes.
          </p>
        </div>

        <button
          onClick={loadEnquiries}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
        >
          Refresh Leads
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === opt.value
                ? "bg-[#8A1538] text-white shadow-sm"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
          Loading bulk enquiries...
        </div>
      ) : enquiries.length === 0 ? (
        <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
          <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="font-medium text-stone-700">No Enquiries Found in this Stage</p>
          <p className="text-xs text-stone-400 mt-1">Select &apos;All Leads&apos; or wait for new customer requests from the storefront.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Lead Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif font-bold text-xl text-stone-900">
                      {enquiry.name}
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-[#8A1538] border border-rose-200">
                      {enquiry.enquiry_type}
                    </span>
                    <span className="text-xs text-stone-400">
                      Received {new Date(enquiry.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Contact Badges */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-stone-600">
                    <a
                      href={`tel:${enquiry.phone}`}
                      className="inline-flex items-center gap-1.5 text-[#8A1538] hover:underline bg-[#8A1538]/5 px-2.5 py-1 rounded-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {enquiry.phone}
                    </a>
                    {enquiry.email && (
                      <a
                        href={`mailto:${enquiry.email}`}
                        className="inline-flex items-center gap-1.5 text-stone-700 hover:underline bg-stone-100 px-2.5 py-1 rounded-md"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {enquiry.email}
                      </a>
                    )}
                    {enquiry.event_date && (
                      <span className="inline-flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        Target Date: {enquiry.event_date}
                      </span>
                    )}
                    {enquiry.estimated_quantity && (
                      <span className="inline-flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">
                        <Users className="w-3.5 h-3.5" />
                        Scale: {enquiry.estimated_quantity}
                      </span>
                    )}
                  </div>

                  {/* Requirements / Sweets of Interest */}
                  {enquiry.items_of_interest && (
                    <div className="text-xs text-stone-800 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <span className="font-bold text-stone-900 block mb-0.5">Sweets Requested:</span>
                      {enquiry.items_of_interest}
                    </div>
                  )}

                  {/* Custom Message / Notes */}
                  {enquiry.message && (
                    <div className="text-xs text-stone-600 bg-stone-50/50 p-3 rounded-xl border border-stone-150">
                      <span className="font-bold text-stone-700 block mb-0.5">Customer Message & Customization:</span>
                      <p className="whitespace-pre-wrap">{enquiry.message}</p>
                    </div>
                  )}
                </div>

                {/* Pipeline Controls & Internal Notes */}
                <div className="w-full lg:w-80 shrink-0 space-y-4 pt-4 lg:pt-0 lg:border-l lg:border-stone-100 lg:pl-6">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Pipeline Status
                    </label>
                    <select
                      value={enquiry.status}
                      onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#8A1538] outline-none"
                    >
                      <option value="NEW">🔵 New Lead</option>
                      <option value="CONTACTED">🟡 Contacted</option>
                      <option value="QUOTED">🟣 Quoted Sent</option>
                      <option value="WON">🟢 Won (Confirmed)</option>
                      <option value="LOST">⚪ Lost / Declined</option>
                    </select>
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Internal Notes
                      </label>
                      <button
                        onClick={() => handleSaveNotes(enquiry.id)}
                        disabled={savingNoteId === enquiry.id}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A1538] hover:underline"
                      >
                        <Save className="w-3 h-3" />
                        {savingNoteId === enquiry.id ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Add quotation amount, call history, sample dispatch tracking..."
                      value={editingNotes[enquiry.id] || ""}
                      onChange={(e) =>
                        setEditingNotes({ ...editingNotes, [enquiry.id]: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs text-stone-800 focus:bg-white focus:border-[#8A1538] outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDelete(enquiry.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Lead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
