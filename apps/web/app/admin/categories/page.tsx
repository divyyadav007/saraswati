"use client";

import { useEffect, useState } from "react";
import { catalogApi, Category } from "@/lib/api-client";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    display_order: 0,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catalogApi.getCategories(true);
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load categories from backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      display_order: categories.length + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image_url: cat.image_url || "",
      display_order: cat.display_order,
      is_active: cat.is_active,
    });
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // In dev / Phase 2 testing, token placeholder or local dev mock
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "mock-admin-token" : "";
    try {
      if (editingCategory) {
        await catalogApi.adminUpdateCategory(editingCategory.id, formData, token);
      } else {
        await catalogApi.adminCreateCategory(formData, token);
      }
      setModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setError(err?.message || "Error saving category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "mock-admin-token" : "";
    try {
      await catalogApi.adminDeleteCategory(id, token);
      await fetchCategories();
    } catch (err: any) {
      alert(`Error deleting category: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-xl font-serif font-bold text-stone-900">
            Categories Directory
          </h1>
          <p className="text-sm text-stone-500">
            Total {categories.length} active sweet and snack categories
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[#8A1538] text-white text-sm font-medium hover:bg-rose-900 transition-colors shadow-sm"
        >
          <span className="mr-2 text-base">+</span> Add Category
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchCategories}
            className="text-xs font-semibold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No categories found. Click &quot;Add Category&quot; to create your first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Order</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Slug</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6 text-stone-500 font-mono text-xs">
                      #{cat.display_order}
                    </td>
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      <div className="flex items-center space-x-3">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#8A1538] flex items-center justify-center font-bold text-xs border border-amber-200">
                            {cat.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-500 font-mono text-xs">
                      {cat.slug}
                    </td>
                    <td className="py-4 px-6 text-stone-600 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cat.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-bold text-stone-900">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Kaju & Dry Fruit Sweets"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="e.g. kaju-dryfruit"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono text-xs focus:outline-hidden focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description for category listings"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[#8A1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[#8A1538]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        display_order: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[#8A1538]"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="inline-flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="rounded text-[#8A1538] focus:ring-[#8A1538] w-4 h-4"
                    />
                    <span className="text-xs font-medium text-stone-700">
                      Active Category
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#8A1538] text-white text-xs font-semibold rounded-lg hover:bg-rose-900 transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
