import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
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
      
      {/* ── Heritage Header & Title ─────────────────────────────────────────── */}
      <div className="bg-[#F2E5CE] rounded-t-[80px] sm:rounded-t-[120px] rounded-b-2xl border-2 border-[#DCA47C]/40 p-8 sm:p-12 md:p-16 text-center mb-8 relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-[#3A3028]/5 mix-blend-multiply pointer-events-none"></div>
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#3A3028]/10 to-transparent"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Breadcrumb - subtle */}
          <nav className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-[#3A3028]/60 mb-6 font-medium tracking-wide uppercase" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#3A3028]" aria-current={!currentCategory ? "page" : undefined}>All Sweets</span>
            {currentCategory && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--color-primary)] font-bold" aria-current="page">{currentCategory.replace(/-/g, " ")}</span>
              </>
            )}
          </nav>

          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
            <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
              Explore Our
            </span>
            <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#3A3028] mb-4 leading-tight">
            {currentCategory ? `Sweets: ${currentCategory.replace(/-/g, " ")}` : "Mithai Collection"}
          </h1>
          <p className="text-sm md:text-base text-[#3A3028]/80 italic font-serif">
            Freshly prepared daily in Barabanki using time-honored recipes.<br className="hidden sm:block"/>
            Showing {products.length} of {totalItems} varieties available today.
          </p>
        </div>
      </div>

      {/* ── Vintage Search Bar ─────────────────────────────────────────────── */}
      <div className="max-w-md mx-auto mb-12 relative z-20 -mt-16 px-4">
        <form method="GET" action="/products" className="w-full bg-white rounded-full shadow-lg border border-[#DCA47C]/30 p-1 relative flex items-center" role="search">
          {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
          <label htmlFor="products-search" className="sr-only">Search mithai</label>
          <div className="pl-5 pr-2 text-[var(--color-primary)]">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            id="products-search"
            type="search"
            name="q"
            defaultValue={currentQuery || ""}
            placeholder="Search by mithai name..."
            className="w-full bg-transparent border-none py-2.5 pr-5 text-sm text-[var(--color-text-primary)] outline-none font-serif italic placeholder:text-gray-400"
          />
          <button type="submit" className="sr-only">Search</button>
        </form>
      </div>

      {/* ── Heritage Filter Index ───────────────────────────────────────────── */}
      <div className="mb-10 px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#DCA47C]/30">
          
          {/* Index style categories */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-3 text-sm font-serif" role="group" aria-label="Filter by category">
            <Link
              href={currentQuery ? `/products?q=${encodeURIComponent(currentQuery)}` : "/products"}
              className={`transition-all ${
                !currentCategory
                  ? "text-[var(--color-primary)] font-bold border-b-2 border-[var(--color-primary)] pb-1"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              }`}
            >
              All Sweets
            </Link>
            
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-4">
                <span className="text-[#DCA47C] text-[10px]" aria-hidden="true">❈</span>
                <Link
                  href={`/products?category=${c.slug}${currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : ""}`}
                  className={`transition-all ${
                    currentCategory === c.slug
                      ? "text-[var(--color-primary)] font-bold border-b-2 border-[var(--color-primary)] pb-1"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {c.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Sort Dropdown - Minimal */}
          <form method="GET" action="/products" className="flex items-center gap-2 shrink-0">
            {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
            {currentQuery && <input type="hidden" name="q" value={currentQuery} />}
            <label htmlFor="sort-select" className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#DCA47C] font-bold">Sort</label>
            <select
              id="sort-select"
              name="sort"
              defaultValue={currentSort || ""}
              className="bg-transparent border-none text-sm font-serif font-bold text-[var(--color-text-primary)] outline-none cursor-pointer text-right focus:ring-0"
            >
              <option value="">Featured</option>
              <option value="price_asc">Lowest Price</option>
              <option value="price_desc">Highest Price</option>
              <option value="newest">Newest</option>
            </select>
          </form>
        </div>
      </div>

      {/* ── Product Grid ────────────────────────────────────────────────────── */}
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
