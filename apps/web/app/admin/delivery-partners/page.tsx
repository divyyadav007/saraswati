"use client";

import { useEffect, useState } from "react";
import { deliveryPartnerApi, DeliveryPartnerModel } from "@/lib/api-client";

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState<DeliveryPartnerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartnerModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    vehicle_type: "Scooter",
    vehicle_number: "",
    notes: "",
  });

  const getAdminToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token") || "mock-admin-token";
    }
    return "mock-admin-token";
  };

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      const data = await deliveryPartnerApi.list(undefined, token);
      setPartners(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load delivery partners");
      // Fallback demo partners for initial state / preview
      setPartners([
        {
          id: "dp-1",
          name: "Raju Verma",
          phone: "+91 94150 99887",
          vehicle_type: "Scooter",
          vehicle_number: "UP 41 AB 4321",
          is_active: true,
          notes: "Main market and Civil Lines specialist",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dp-2",
          name: "Amit Tiwari",
          phone: "+91 98390 11223",
          vehicle_type: "Motorcycle",
          vehicle_number: "UP 41 XY 9081",
          is_active: true,
          notes: "Naka Satrikh and Outer bypass delivery",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dp-3",
          name: "Suresh Yadav",
          phone: "+91 94500 44556",
          vehicle_type: "Electric Scooter",
          vehicle_number: "UP 41 EV 1002",
          is_active: false,
          notes: "On leave for festival week",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData({
      name: "",
      phone: "",
      vehicle_type: "Scooter",
      vehicle_number: "",
      notes: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (partner: DeliveryPartnerModel) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      phone: partner.phone,
      vehicle_type: partner.vehicle_type || "Scooter",
      vehicle_number: partner.vehicle_number || "",
      notes: partner.notes || "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError("Name and Phone number are required");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const token = getAdminToken();

      if (editingPartner) {
        await deliveryPartnerApi.update(
          editingPartner.id,
          {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            vehicle_type: formData.vehicle_type.trim() || null,
            vehicle_number: formData.vehicle_number.trim() || null,
            notes: formData.notes.trim() || null,
          },
          token
        );
      } else {
        await deliveryPartnerApi.create(
          {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            vehicle_type: formData.vehicle_type.trim() || undefined,
            vehicle_number: formData.vehicle_number.trim() || undefined,
            notes: formData.notes.trim() || undefined,
          },
          token
        );
      }

      setIsModalOpen(false);
      await loadPartners();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save delivery partner");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (partner: DeliveryPartnerModel) => {
    try {
      const token = getAdminToken();
      await deliveryPartnerApi.update(
        partner.id,
        { is_active: !partner.is_active },
        token
      );
      setPartners((prev) =>
        prev.map((p) =>
          p.id === partner.id ? { ...p, is_active: !p.is_active } : p
        )
      );
    } catch (err: any) {
      alert(err?.message || "Failed to toggle partner status");
    }
  };

  const handleDelete = async (partner: DeliveryPartnerModel) => {
    if (!confirm(`Are you sure you want to deactivate ${partner.name}?`)) {
      return;
    }
    try {
      const token = getAdminToken();
      await deliveryPartnerApi.delete(partner.id, token);
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, is_active: false } : p))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate partner");
    }
  };

  const activeCount = partners.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Delivery Partners & Fleet
          </h2>
          <p className="text-sm text-stone-500">
            Manage local Barabanki delivery personnel for order dispatch & fulfillment
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#8A1538] text-white text-xs font-bold hover:bg-[#70102D] shadow-sm transition-all"
        >
          + Add Delivery Partner
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Total Partners
          </div>
          <div className="font-serif text-2xl font-bold text-stone-900 mt-1">
            {partners.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Active for Dispatch
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-700 mt-1">
            {activeCount}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Inactive / On Leave
          </div>
          <div className="font-serif text-2xl font-bold text-stone-400 mt-1">
            {partners.length - activeCount}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex justify-between items-center">
          <span>{error} (showing local fallback view)</span>
          <button
            onClick={loadPartners}
            className="font-bold underline text-amber-900 hover:text-amber-700 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Partners List */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Loading delivery fleet...</div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No delivery partners registered yet. Click &quot;Add Delivery Partner&quot; to register your first rider.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Rider Name</th>
                  <th className="py-3.5 px-6">Phone Number</th>
                  <th className="py-3.5 px-6">Vehicle Details</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Notes</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                          {p.name.charAt(0)}
                        </span>
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-stone-700">
                      <a href={`tel:${p.phone}`} className="hover:text-[#8A1538] hover:underline">
                        {p.phone}
                      </a>
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-600">
                      <div className="font-semibold text-stone-800">
                        {p.vehicle_type || "Standard Vehicle"}
                      </div>
                      <div className="font-mono text-stone-500">
                        {p.vehicle_number || "No plate recorded"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                        }`}
                      >
                        {p.is_active ? "● Active" : "○ Inactive"}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-500 max-w-xs truncate">
                      {p.notes || "—"}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-xs font-semibold"
                      >
                        Edit
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingPartner ? "Edit Delivery Partner" : "Add Delivery Partner"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Raju Verma"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A1538]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 94150 99887"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A1538]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A1538] bg-white"
                  >
                    <option value="Scooter">Scooter</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Van">Delivery Van</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_number: e.target.value })
                    }
                    placeholder="UP 41 AB 1234"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A1538]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Preferred delivery zones, shift timing"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A1538]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#8A1538] text-white font-bold hover:bg-[#70102D] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingPartner ? "Update Partner" : "Create Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
