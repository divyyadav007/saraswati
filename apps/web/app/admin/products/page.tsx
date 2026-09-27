"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  catalogApi,
  ProductListItem,
  Category,
  ProductDetail,
} from "@/lib/api-client";

interface VariantFormState {
  label: string;
  weight_grams: number;
  price: number;
  mrp?: number;
  sku: string;
  stock_status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  stock_quantity: number;
  is_active: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Product Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    category_id: string;
    name: string;
    slug: string;
    description: string;
    tags: string[];
    is_featured: boolean;
    is_active: boolean;
  }>({
    category_id: "",
    name: "",
    slug: "",
    description: "",
    tags: ["fresh", "traditional"],
    is_featured: false,
    is_active: true,
  });

  // Variants State for Modal
  const [variants, setVariants] = useState<VariantFormState[]>([
    {
      label: "250g",
      weight_grams: 250,
      price: 250,
      mrp: 280,
      sku: "SKU-250G",
      stock_status: "IN_STOCK",
      stock_quantity: 50,
      is_active: true,
    },
    {
      label: "500g",
      weight_grams: 500,
      price: 480,
      mrp: 550,
      sku: "SKU-500G",
      stock_status: "IN_STOCK",
      stock_quantity: 40,
      is_active: true,
    },
  ]);

  // Images State for Modal
  const [images, setImages] = useState<
    Array<{ url: string; storage_path: string; is_primary: boolean }>
  >([
    {
      url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
      storage_path: "products/sample-sweet.jpg",
      is_primary: true,
    },
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catList, prodRes] = await Promise.all([
        catalogApi.getCategories(true),
        catalogApi.getProducts({ page_size: 100 }),
      ]);
      setCategories(catList);
      setProducts(prodRes.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load catalogue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      category_id: categories[0]?.id || "",
      name: "",
      slug: "",
      description: "",
      tags: ["desi-ghee", "sweets"],
      is_featured: false,
      is_active: true,
    });
    setVariants([
      {
        label: "250g",
        weight_grams: 250,
        price: 250,
        mrp: 280,
        sku: "SKU-250G",
        stock_status: "IN_STOCK",
        stock_quantity: 50,
        is_active: true,
      },
      {
        label: "500g",
        weight_grams: 500,
        price: 480,
        mrp: 550,
        sku: "SKU-500G",
        stock_status: "IN_STOCK",
        stock_quantity: 40,
        is_active: true,
      },
    ]);
    setImages([
      {
        url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
        storage_path: "products/sample.jpg",
        is_primary: true,
      },
    ]);
    setModalOpen(true);
  };

  const openEditModal = async (prod: ProductListItem) => {
    try {
      setSubmitting(true);
      const fullDetail = await catalogApi.getProductBySlug(prod.slug);
      setEditingProduct(fullDetail);
      setFormData({
        category_id: fullDetail.category_id,
        name: fullDetail.name,
        slug: fullDetail.slug,
        description: fullDetail.description || "",
        tags: fullDetail.tags || [],
        is_featured: fullDetail.is_featured,
        is_active: fullDetail.is_active,
      });
      setVariants(
        fullDetail.variants.map((v) => ({
          label: v.label,
          weight_grams: v.weight_grams ?? 0,
          price: v.price,
          mrp: v.mrp ?? undefined,
          sku: v.sku || "",
          stock_status: v.stock_status,
          stock_quantity: v.stock_quantity ?? 0,
          is_active: v.is_active,
        }))
      );
      setImages(
        fullDetail.images.map((img) => ({
          url: img.url,
          storage_path: img.storage_path,
          is_primary: img.is_primary,
        }))
      );
      setModalOpen(true);
    } catch (err: any) {
      alert(`Error fetching product details: ${err?.message || "Failed"}`);
    } finally {
      setSubmitting(false);
    }
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
      slug: editingProduct ? prev.slug : slug,
    }));
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        label: "1kg",
        weight_grams: 1000,
        price: 900,
        mrp: 1000,
        sku: `SKU-${Date.now().toString().slice(-4)}`,
        stock_status: "IN_STOCK",
        stock_quantity: 30,
        is_active: true,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateVariant = (
    index: number,
    field: keyof VariantFormState,
    value: any
  ) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddImage = () => {
    setImages((prev) => [
      ...prev,
      {
        url: "",
        storage_path: "products/user-uploaded.jpg",
        is_primary: prev.length === 0,
      },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (variants.length === 0) {
      alert("Please add at least one weight variant (e.g. 250g, 500g, 1kg)");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "mock-admin-token" : "";
    setSubmitting(true);
    try {
      if (editingProduct) {
        await catalogApi.adminUpdateProduct(editingProduct.id, formData, token);
      } else {
        const createdProduct = await catalogApi.adminCreateProduct(formData, token);
        // Create initial variants
        for (const v of variants) {
          await catalogApi.adminCreateVariant(createdProduct.id, {
            label: v.label,
            weight_grams: Number(v.weight_grams),
            price: Number(v.price),
            mrp: v.mrp ? Number(v.mrp) : undefined,
            sku: v.sku,
            stock_status: v.stock_status,
            stock_quantity: Number(v.stock_quantity),
            is_active: v.is_active,
          }, token);
        }
        // Create initial images
        const validImages = images.filter((img) => img.url.trim().length > 0);
        for (let idx = 0; idx < validImages.length; idx++) {
          const img = validImages[idx];
          await catalogApi.adminCreateImage(createdProduct.id, {
            url: img.url.trim(),
            storage_path: img.storage_path || `products/${createdProduct.slug}-${idx}.jpg`,
            display_order: idx,
            is_primary: img.is_primary,
          }, token);
        }
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving product: ${err?.message || "Check fields and try again"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) {
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "mock-admin-token" : "";
    try {
      await catalogApi.adminDeleteProduct(id, token);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting product: ${err?.message || "Unknown error"}`);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchTerm === "" ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === "" || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-xl font-serif font-bold text-stone-900">
            Products & Variants Catalogue
          </h1>
          <p className="text-sm text-stone-500">
            Manage sweets, packaging sizes, prices, and inventory
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-rose-900 transition-colors shadow-sm"
        >
          <span className="mr-2 text-base">+</span> Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by sweet name or category..."
            className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-hidden focus:border-[var(--color-primary)]"
          />
          <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-hidden focus:border-[var(--color-primary)]"
        >
          <option value="">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs font-semibold underline ml-3">
            Retry
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            No products found matching your search. Click &quot;Add Product&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Variants</th>
                  <th className="py-3.5 px-6">Starting Price</th>
                  <th className="py-3.5 px-6">Badges</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      <div className="flex items-center space-x-3">
                        {p.primary_image_url ? (
                          <img
                            src={p.primary_image_url}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-50 text-[var(--color-primary)] flex items-center justify-center font-bold text-sm border border-amber-200">
                            🍬
                          </div>
                        )}
                        <div>
                          <div className="font-serif font-bold text-stone-900">{p.name}</div>
                          <div className="text-xs text-stone-400 font-mono">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-stone-100 text-xs font-medium text-stone-700">
                        {p.category_name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-stone-600">
                      <span className="font-semibold text-stone-800">
                        {p.variants?.length || 1} size(s)
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-[var(--color-primary)]">
                      ₹{p.starting_price || p.min_price || 0}
                    </td>
                    <td className="py-4 px-6">
                      {p.is_featured && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                          ⭐ Featured
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {p.is_active ? "Active" : "Draft"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        href={`/products/${p.slug}`}
                        target="_blank"
                        className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors inline-block"
                      >
                        Preview
                      </Link>
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
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

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {editingProduct ? `Edit: ${editingProduct.name}` : "Add New Sweet Product"}
                </h2>
                <p className="text-xs text-stone-500">
                  Configure details, multiple weight variants (250g, 500g, 1kg), and photo gallery
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 border-b pb-1">
                  1. Product Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Kaju Katli (Royal Silver)"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-hidden focus:border-[var(--color-primary)]"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono text-xs focus:outline-hidden focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags.join(", ")}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="desi-ghee, cashew, silver-vark"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Rich description highlighting pure desi ghee or cashew indulgence..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="flex items-center space-x-6 pt-2">
                  <label className="inline-flex items-center cursor-pointer space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_featured: e.target.checked,
                        }))
                      }
                      className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4"
                    />
                    <span className="text-xs font-medium text-stone-700">
                      ⭐ Featured on Homepage
                    </span>
                  </label>

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
                      className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4"
                    />
                    <span className="text-xs font-medium text-stone-700">
                      Active (Visible to Shoppers)
                    </span>
                  </label>
                </div>
              </div>

              {/* Weight Variants Manager */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                      2. Weight Variants & Prices
                    </h3>
                    <p className="text-xs text-stone-500">
                      Configure individual package sizes (e.g. 250g, 500g, 1kg)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-semibold"
                  >
                    + Add Size Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-lg grid grid-cols-2 sm:grid-cols-6 gap-2 items-center"
                    >
                      <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-stone-500">
                          Label
                        </label>
                        <input
                          type="text"
                          required
                          value={v.label}
                          onChange={(e) =>
                            handleUpdateVariant(idx, "label", e.target.value)
                          }
                          placeholder="e.g. 500g"
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-stone-500">
                          Grams
                        </label>
                        <input
                          type="number"
                          required
                          value={v.weight_grams}
                          onChange={(e) =>
                            handleUpdateVariant(
                              idx,
                              "weight_grams",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-[var(--color-primary)]">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={v.price}
                          onChange={(e) =>
                            handleUpdateVariant(
                              idx,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-rose-300 font-semibold rounded bg-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-stone-500">
                          MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={v.mrp || ""}
                          onChange={(e) =>
                            handleUpdateVariant(
                              idx,
                              "mrp",
                              parseFloat(e.target.value) || undefined
                            )
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-stone-500">
                          Stock Qty
                        </label>
                        <input
                          type="number"
                          value={v.stock_quantity}
                          onChange={(e) =>
                            handleUpdateVariant(
                              idx,
                              "stock_quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>

                      <div className="col-span-1 flex items-center justify-end pt-3">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Images Manager */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                      3. Product Images
                    </h3>
                    <p className="text-xs text-stone-500">
                      Provide high-resolution image URLs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-semibold"
                  >
                    + Add Image URL
                  </button>
                </div>

                <div className="space-y-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-stone-50 p-2 rounded-lg border border-stone-200"
                    >
                      <input
                        type="url"
                        value={img.url}
                        onChange={(e) => {
                          const copy = [...images];
                          copy[idx].url = e.target.value;
                          setImages(copy);
                        }}
                        placeholder="https://..."
                        className="flex-1 px-2.5 py-1.5 text-xs border rounded bg-white"
                      />
                      <label className="inline-flex items-center space-x-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="primary_image"
                          checked={img.is_primary}
                          onChange={() => {
                            setImages((prev) =>
                              prev.map((item, i) => ({
                                ...item,
                                is_primary: i === idx,
                              }))
                            );
                          }}
                        />
                        <span className="text-[11px] text-stone-600">Cover</span>
                      </label>
                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
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
                  className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-lg hover:bg-rose-900 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Create Product & Variants"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

