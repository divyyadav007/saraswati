import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { catalogApi, ProductListItem, Category } from "@/lib/api-client";
import { ProductCard } from "@/components/storefront/ProductCard";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
    page?: string;
  }>;
}

const FALLBACK_PRODUCTS: ProductListItem[] = [
  {
    id: "fb-1",
    category_id: "c-1",
    category_name: "Traditional Sweets",
    name: "Pure Desi Ghee Gulab Jamun",
    slug: "gulab-jamun",
    description: "Soft golden milk-solid dumplings soaked in aromatic rose and cardamom syrup.",
    tags: ["ghee", "classic", "bestseller"],
    is_active: true,
    is_featured: true,
    primary_image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
    starting_price: 350,
    min_price: 350,
    max_price: 680,
    variants: [
      { id: "v-1", product_id: "fb-1", label: "500g", weight_grams: 500, price: 350, mrp: 400, sku: "GJ-500", stock_status: "IN_STOCK", stock_quantity: 50, is_active: true },
      { id: "v-2", product_id: "fb-1", label: "1kg Box", weight_grams: 1000, price: 680, mrp: 750, sku: "GJ-1000", stock_status: "IN_STOCK", stock_quantity: 30, is_active: true },
    ],
  },
  {
    id: "fb-2",
    category_id: "c-2",
    category_name: "Dry Fruit Sweets",
    name: "Shahi Kaju Katli",
    slug: "kaju-katli",
    description: "Diamond-cut cashew fudge made with premium Goan cashews and edible silver foil.",
    tags: ["cashew", "festive", "premium"],
    is_active: true,
    is_featured: true,
    primary_image_url: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80",
    starting_price: 520,
    min_price: 520,
    max_price: 1000,
    variants: [
      { id: "v-3", product_id: "fb-2", label: "500g", weight_grams: 500, price: 520, mrp: 550, sku: "KK-500", stock_status: "IN_STOCK", stock_quantity: 40, is_active: true },
      { id: "v-4", product_id: "fb-2", label: "1kg Box", weight_grams: 1000, price: 1000, mrp: 1100, sku: "KK-1000", stock_status: "IN_STOCK", stock_quantity: 25, is_active: true },
    ],
  },
  {
    id: "fb-3",
    category_id: "c-3",
    category_name: "Bengali Sweets",
    name: "Kolkata Rasgulla",
    slug: "rasgulla",
    description: "Spongy, succulent cottage cheese spheres steeped in light crystallized sugar syrup.",
    tags: ["chhena", "sponge", "classic"],
    is_active: true,
    is_featured: true,
    primary_image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80",
    starting_price: 280,
    min_price: 280,
    max_price: 520,
    variants: [
      { id: "v-5", product_id: "fb-3", label: "500g (10 Pcs)", weight_grams: 500, price: 280, mrp: 300, sku: "RG-500", stock_status: "IN_STOCK", stock_quantity: 60, is_active: true },
      { id: "v-6", product_id: "fb-3", label: "1kg (20 Pcs)", weight_grams: 1000, price: 520, mrp: 580, sku: "RG-1000", stock_status: "IN_STOCK", stock_quantity: 35, is_active: true },
    ],
  },
  {
    id: "fb-4",
    category_id: "c-1",
    category_name: "Traditional Sweets",
    name: "Motichoor Desi Ghee Laddoo",
    slug: "motichoor-laddoo",
    description: "Tiny gram-flour pearls fried in pure ghee and bound with kesar and melon seeds.",
    tags: ["ghee", "pooja", "traditional"],
    is_active: true,
    is_featured: true,
    primary_image_url: "https://images.unsplash.com/photo-1599785209796-786432b228bc?w=600&auto=format&fit=crop&q=80",
    starting_price: 320,
    min_price: 320,
    max_price: 600,
    variants: [
      { id: "v-7", product_id: "fb-4", label: "500g", weight_grams: 500, price: 320, mrp: 360, sku: "ML-500", stock_status: "IN_STOCK", stock_quantity: 45, is_active: true },
      { id: "v-8", product_id: "fb-4", label: "1kg Box", weight_grams: 1000, price: 600, mrp: 680, sku: "ML-1000", stock_status: "IN_STOCK", stock_quantity: 20, is_active: true },
    ],
  },
];

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const currentCategory = params.category;
  const currentQuery = params.q;
  const currentSort = params.sort;
  const currentPage = parseInt(params.page || "1", 10);

  let products = FALLBACK_PRODUCTS;
  let totalItems = FALLBACK_PRODUCTS.length;
  let totalPages = 1;
  let categories: Category[] = [];

  try {
    const [prodRes, catRes] = await Promise.all([
      catalogApi.getProducts({
        category: currentCategory,
        q: currentQuery,
        sort: currentSort,
        page: currentPage,
        page_size: 12,
      }),
      catalogApi.getCategories(),
    ]);

    if (prodRes?.items) {
      products = prodRes.items;
      totalItems = prodRes.total_items;
      totalPages = prodRes.total_pages;
    }
    if (catRes) {
      categories = catRes;
    }
  } catch {
    // If backend connection fails in SSR, apply local filtering on fallback set
    let filtered = [...FALLBACK_PRODUCTS];
    if (currentCategory) {
      filtered = filtered.filter((p) => p.category_name?.toLowerCase().includes(currentCategory.toLowerCase()));
    }
    if (currentQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(currentQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(currentQuery.toLowerCase()))
      );
    }
    products = filtered;
    totalItems = filtered.length;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-2 font-medium" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--color-text-primary)]" aria-current={!currentCategory ? "page" : undefined}>All Sweets</span>
            {currentCategory && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--color-primary)] font-semibold capitalize" aria-current="page">{currentCategory.replace(/-/g, " ")}</span>
              </>
            )}
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
            {currentCategory ? `Sweets: ${currentCategory.replace(/-/g, " ")}` : "All Handcrafted Sweets"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Showing {products.length} of {totalItems} varieties available today
          </p>
        </div>

        {/* Search Bar */}
        <form method="GET" action="/products" className="w-full md:w-80 relative shrink-0" role="search">
          {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
          <label htmlFor="products-search" className="sr-only">Search mithai</label>
          <input
            id="products-search"
            type="search"
            name="q"
            defaultValue={currentQuery || ""}
            placeholder="Search mithai..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
          />
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        </form>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" role="group" aria-label="Filter by category">
          <Link
            href={currentQuery ? `/products?q=${encodeURIComponent(currentQuery)}` : "/products"}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              !currentCategory
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            All Sweets
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}${currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : ""}`}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                currentCategory === c.slug
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Sort Dropdown */}
        <form method="GET" action="/products" className="flex items-center gap-2">
          {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
          {currentQuery && <input type="hidden" name="q" value={currentQuery} />}
          <label htmlFor="sort-select" className="sr-only">Sort products</label>
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          <select
            id="sort-select"
            name="sort"
            defaultValue={currentSort || ""}
            className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] rounded-xl px-3 py-1.5 outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newly Introduced</option>
          </select>
        </form>
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center mx-auto text-3xl mb-4" aria-hidden="true">
            🔍
          </div>
          <h3 className="font-serif text-2xl font-bold text-[var(--color-text-primary)]">No Sweets Found</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-6">
            We couldn&apos;t find any sweets matching your criteria. Try adjusting your search or exploring our complete menu.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Reset All Filters
          </Link>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="mt-12 flex justify-center items-center gap-3" aria-label="Page navigation">
          <Link
            href={`/products?page=${Math.max(1, currentPage - 1)}${currentCategory ? `&category=${currentCategory}` : ""}${currentQuery ? `&q=${currentQuery}` : ""}`}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--color-border)] transition-colors ${
              currentPage <= 1
                ? "pointer-events-none opacity-40 bg-[var(--color-surface)]"
                : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]"
            }`}
            aria-label="Previous page"
            aria-disabled={currentPage <= 1}
          >
            Previous
          </Link>
          <span className="text-xs text-[var(--color-text-muted)] font-medium px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={`/products?page=${Math.min(totalPages, currentPage + 1)}${currentCategory ? `&category=${currentCategory}` : ""}${currentQuery ? `&q=${currentQuery}` : ""}`}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--color-border)] transition-colors ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-40 bg-[var(--color-surface)]"
                : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]"
            }`}
            aria-label="Next page"
            aria-disabled={currentPage >= totalPages}
          >
            Next
          </Link>
        </nav>
      )}
    </div>
  );
}
