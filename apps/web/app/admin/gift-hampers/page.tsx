"use client";

import { useEffect, useState } from "react";
import {
  giftHamperApi,
  GiftHamperModel,
  GiftHamperDetailModel,
  catalogApi,
  ProductListItem,
} from "@/lib/api-client";
import {
  Gift,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function AdminGiftHampersPage() {
  const [hampers, setHampers] = useState<GiftHamperModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHamper, setSelectedHamper] = useState<GiftHamperDetailModel | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Available catalog products for constituent item selection
  const [catalogProducts, setCatalogProducts] = useState<ProductListItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);

  // Create form state
  const [newHamper, setNewHamper] = useState({
    name: "",
    description: "",
    hamper_price: 999,
    is_active: true,
  });

  // Add Item state
  const [newItem, setNewItem] = useState({
    product_id: "",
    product_variant_id: "",
    quantity: 1,
  });

  // Add Image state
  const [newImage, setNewImage] = useState({
    url: "",
    storage_path: "",
    is_primary: true,
    display_order: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAdminToken = () => {
    if (typeof window === "undefined") return "mock-admin-token";
    return localStorage.getItem("auth_token") || "mock-admin-token";
  };

  const loadHampers = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const data = await giftHamperApi.adminList(token, 1, 50);
      setHampers(data.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load hampers");
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const data = await catalogApi.getProducts({ page: 1, page_size: 100 });
      setCatalogProducts(data.items);
    } catch (err) {
      console.error("Failed to load catalog products", err);
    }
  };

  useEffect(() => {
    loadHampers();
    loadCatalog();
  }, []);

  const handleCreateHamper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHamper.name.trim()) return;

    try {
      setSaving(true);
      const token = getAdminToken();
      await giftHamperApi.adminCreate(newHamper, token);
      setShowCreateModal(false);
      setNewHamper({ name: "", description: "", hamper_price: 999, is_active: true });
      await loadHampers();
    } catch (err: any) {
      alert(err?.message || "Failed to create hamper");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = async (hamper: GiftHamperModel) => {
    try {
      const data = await giftHamperApi.getBySlug(hamper.slug);
      setSelectedHamper(data);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err?.message || "Failed to load hamper details");
    }
  };

  const handleSelectProduct = (productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId) || null;
    setSelectedProduct(prod);
    setNewItem((prev) => ({
      ...prev,
      product_id: productId,
      product_variant_id: prod?.variants && prod.variants.length > 0 ? prod.variants[0].id : "",
    }));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHamper || !newItem.product_id || !newItem.product_variant_id) return;

    try {
      setSaving(true);
      const token = getAdminToken();
      const updated = await giftHamperApi.adminAddItem(
        selectedHamper.id,
        {
          product_id: newItem.product_id,
          product_variant_id: newItem.product_variant_id,
          quantity: newItem.quantity,
        },
        token
      );
      setSelectedHamper(updated);
      setNewItem({ product_id: "", product_variant_id: "", quantity: 1 });
      setSelectedProduct(null);
      await loadHampers();
    } catch (err: any) {
      alert(err?.message || "Failed to add constituent sweet item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedHamper) return;
    if (!confirm("Are you sure you want to remove this sweet from the hamper?")) return;

    try {
      const token = getAdminToken();
      await giftHamperApi.adminDeleteItem(selectedHamper.id, itemId, token);
      const updated = await giftHamperApi.getBySlug(selectedHamper.slug);
      setSelectedHamper(updated);
      await loadHampers();
    } catch (err: any) {
      alert(err?.message || "Failed to remove item");
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHamper || !newImage.url.trim()) return;

    try {
      setSaving(true);
      const token = getAdminToken();
      const updated = await giftHamperApi.adminAddImage(
        selectedHamper.id,
        newImage,
        token
      );
      setSelectedHamper(updated);
      setNewImage({ url: "", storage_path: "", is_primary: false, display_order: 0 });
      await loadHampers();
    } catch (err: any) {
      alert(err?.message || "Failed to add image");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHamper = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gift hamper? This cannot be undone.")) return;
    try {
      const token = getAdminToken();
      await giftHamperApi.adminDelete(id, token);
      await loadHampers();
      if (selectedHamper?.id === id) {
        setShowDetailModal(false);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete hamper");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Gift className="w-7 h-7 text-[#8A1538]" />
            Gift Hampers Management
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Curate festive gifting boxes, define &quot;What&apos;s inside&quot; constituent sweets, and control live storefront prices.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-[#8A1538] hover:bg-[#70102D] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Gift Hamper
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Hampers Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading gift hampers...</div>
        ) : hampers.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Gift className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="font-medium text-stone-700">No Gift Hampers Created Yet</p>
            <p className="text-xs text-stone-400 mt-1">Click &apos;Create Gift Hamper&apos; to build your first festive collection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-6">Hamper Name & Slug</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {hampers.map((h) => (
                  <tr key={h.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center">
                          {h.primary_image_url ? (
                            <img src={h.primary_image_url} alt={h.name} className="w-full h-full object-cover" />
                          ) : (
                            <Gift className="w-6 h-6 text-stone-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 block">{h.name}</span>
                          <span className="text-xs text-stone-400 font-mono">/{h.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      ₹{h.hamper_price.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          h.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        {h.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {h.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(h)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Manage Items
                        </button>
                        <button
                          onClick={() => handleDeleteHamper(h.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete hamper"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#8A1538]" />
              New Festive Gift Hamper
            </h3>

            <form onSubmit={handleCreateHamper} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Hamper Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Diwali Mithai Trunk"
                  value={newHamper.name}
                  onChange={(e) => setNewHamper({ ...newHamper, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step={0.01}
                  value={newHamper.hamper_price}
                  onChange={(e) => setNewHamper({ ...newHamper, hamper_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the packaging, auspicious significance, and sweets included..."
                  value={newHamper.description}
                  onChange={(e) => setNewHamper({ ...newHamper, description: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:bg-white focus:border-[#8A1538] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={newHamper.is_active}
                  onChange={(e) => setNewHamper({ ...newHamper, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#8A1538] focus:ring-[#8A1538]"
                />
                <label htmlFor="create_is_active" className="text-sm font-medium text-stone-700 cursor-pointer">
                  Publish to Storefront immediately (Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#8A1538] hover:bg-[#70102D] text-white text-sm font-semibold rounded-xl shadow-xs"
                >
                  {saving ? "Creating..." : "Create Hamper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Manage Items Modal */}
      {showDetailModal && selectedHamper && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900">
                  {selectedHamper.name}
                </h2>
                <span className="text-sm font-semibold text-[#8A1538]">
                  Live Storefront Price: ₹{selectedHamper.hamper_price.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Constituent Sweets ("What's inside") */}
            <div className="mb-8">
              <h3 className="font-serif font-bold text-lg text-stone-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A227]" />
                Constituent Sweet Delicacies ({selectedHamper.items?.length || 0})
              </h3>

              {selectedHamper.items?.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-500 italic mb-4">
                  No sweets added to this hamper yet. Use the form below to add mithai varieties.
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedHamper.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm"
                    >
                      <div>
                        <span className="font-bold text-stone-900 block">{it.product_name || "Sweet Item"}</span>
                        {it.variant_label && <span className="text-xs text-stone-500">Pack: {it.variant_label}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-stone-200">
                          Qty: {it.quantity}
                        </span>
                        <button
                          onClick={() => handleDeleteItem(it.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Item Form */}
              <form onSubmit={handleAddItem} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Add Sweet Delicacy to this Hamper
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-500 font-medium mb-1">Select Sweet *</label>
                    <select
                      value={newItem.product_id}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      required
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900"
                    >
                      <option value="">-- Choose Product --</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 font-medium mb-1">Select Variant / Pack *</label>
                    <select
                      value={newItem.product_variant_id}
                      onChange={(e) => setNewItem({ ...newItem, product_variant_id: e.target.value })}
                      required
                      disabled={!selectedProduct}
                      className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900 disabled:opacity-50"
                    >
                      <option value="">-- Choose Variant --</option>
                      {selectedProduct?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} (₹{v.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 font-medium mb-1">Quantity</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-20 bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900"
                      />
                      <button
                        type="submit"
                        disabled={saving || !newItem.product_variant_id}
                        className="flex-1 bg-[#8A1538] hover:bg-[#70102D] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        Add Sweet
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Section 2: Hamper Images */}
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#8A1538]" />
                Hamper Images ({selectedHamper.images?.length || 0})
              </h3>

              <div className="flex flex-wrap gap-3 mb-4">
                {selectedHamper.images?.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-stone-200 group"
                  >
                    <img src={img.url} alt="Hamper" className="w-full h-full object-cover" />
                    {img.is_primary && (
                      <span className="absolute bottom-1 left-1 bg-[#8A1538] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Image Form */}
              <form onSubmit={handleAddImage} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] text-stone-500 font-medium mb-1">Image URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://.../festive-hamper.jpg"
                    value={newImage.url}
                    onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="img_primary"
                    checked={newImage.is_primary}
                    onChange={(e) => setNewImage({ ...newImage, is_primary: e.target.checked })}
                    className="w-4 h-4 rounded text-[#8A1538]"
                  />
                  <label htmlFor="img_primary" className="text-xs text-stone-700">Set as Primary</label>
                </div>
                <button
                  type="submit"
                  disabled={saving || !newImage.url.trim()}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Add Image
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
