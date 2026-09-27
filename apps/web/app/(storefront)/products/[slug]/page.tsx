import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogApi, ProductDetail, ProductReview } from "@/lib/api-client";
import { ProductDetailView } from "@/components/storefront/ProductDetailView";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Fallback products if backend is not running during local dev/SSR
const FALLBACK_DETAIL: Record<string, ProductDetail> = {
  "kaju-katli": {
    id: "p1",
    category_id: "c1",
    category: {
      id: "c1",
      name: "Kaju & Dry Fruit Sweets",
      slug: "kaju-dryfruit",
      description: "Made from premium Goan cashews",
      image_url: null,
      parent_id: null,
      display_order: 1,
      is_active: true,
    },
    name: "Kaju Katli (Royal Silver)",
    slug: "kaju-katli",
    description:
      "Crafted with the finest Goan cashews and pure vark, melt-in-the-mouth perfection with low sugar and rich nutty indulgence.",
    tags: ["bestseller", "silver-vark", "cashew"],
    is_featured: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    rating_summary: {
      average_rating: 4.9,
      total_reviews: 48,
    },
    variants: [
      {
        id: "v1",
        product_id: "p1",
        label: "250g",
        weight_grams: 250,
        price: 275,
        mrp: 300,
        sku: "KK-250G",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 45,
      },
      {
        id: "v2",
        product_id: "p1",
        label: "500g",
        weight_grams: 500,
        price: 525,
        mrp: 580,
        sku: "KK-500G",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 30,
      },
      {
        id: "v3",
        product_id: "p1",
        label: "1kg",
        weight_grams: 1000,
        price: 1000,
        mrp: 1150,
        sku: "KK-1KG",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 20,
      },
    ],
    images: [
      {
        id: "img1",
        product_id: "p1",
        url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
        storage_path: "products/kaju-katli-1.jpg",
        display_order: 0,
        is_primary: true,
      },
      {
        id: "img2",
        product_id: "p1",
        url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
        storage_path: "products/kaju-katli-2.jpg",
        display_order: 1,
        is_primary: false,
      },
    ],
  },
  "motichoor-laddu": {
    id: "p2",
    category_id: "c2",
    category: {
      id: "c2",
      name: "Pure Desi Ghee Sweets",
      slug: "desi-ghee-sweets",
      description: "Prepared in 100% pure desi ghee",
      image_url: null,
      parent_id: null,
      display_order: 2,
      is_active: true,
    },
    name: "Desi Ghee Motichoor Laddu",
    slug: "motichoor-laddu",
    description:
      "Tiny gram flour pearls fried to golden perfection in 100% pure desi ghee, soaked in fragrant saffron and green cardamom syrup.",
    tags: ["desi-ghee", "saffron", "traditional"],
    is_featured: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    rating_summary: {
      average_rating: 4.8,
      total_reviews: 62,
    },
    variants: [
      {
        id: "v4",
        product_id: "p2",
        label: "250g",
        weight_grams: 250,
        price: 160,
        mrp: 180,
        sku: "MCL-250G",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 50,
      },
      {
        id: "v5",
        product_id: "p2",
        label: "500g",
        weight_grams: 500,
        price: 310,
        mrp: 350,
        sku: "MCL-500G",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 40,
      },
      {
        id: "v6",
        product_id: "p2",
        label: "1kg",
        weight_grams: 1000,
        price: 600,
        mrp: 680,
        sku: "MCL-1KG",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 25,
      },
    ],
    images: [
      {
        id: "img3",
        product_id: "p2",
        url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
        storage_path: "products/motichoor-1.jpg",
        display_order: 0,
        is_primary: true,
      },
    ],
  },
  "gulab-jamun": {
    id: "p3",
    category_id: "c2",
    category: {
      id: "c2",
      name: "Pure Desi Ghee Sweets",
      slug: "desi-ghee-sweets",
      description: "Prepared in 100% pure desi ghee",
      image_url: null,
      parent_id: null,
      display_order: 2,
      is_active: true,
    },
    name: "Gulab Jamun (Desi Ghee)",
    slug: "gulab-jamun",
    description:
      "Soft, spongy khoya dumplings fried in pure desi ghee and steeped in cardamom and rose water infused sugar syrup.",
    tags: ["desi-ghee", "khoya", "hot-sweet"],
    is_featured: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    rating_summary: {
      average_rating: 4.9,
      total_reviews: 75,
    },
    variants: [
      {
        id: "v7",
        product_id: "p3",
        label: "500g (Approx 8 pcs)",
        weight_grams: 500,
        price: 240,
        mrp: 270,
        sku: "GJ-500G",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 35,
      },
      {
        id: "v8",
        product_id: "p3",
        label: "1kg (Approx 16 pcs)",
        weight_grams: 1000,
        price: 460,
        mrp: 520,
        sku: "GJ-1KG",
        is_active: true,
        stock_status: "IN_STOCK",
        stock_quantity: 20,
      },
    ],
    images: [
      {
        id: "img4",
        product_id: "p3",
        url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
        storage_path: "products/gulab-jamun-1.jpg",
        display_order: 0,
        is_primary: true,
      },
    ],
  },
};

export default async function ProductDetailPage(props: ProductPageProps) {
  const { slug } = await props.params;

  let product: ProductDetail | null = null;
  let reviews: ProductReview[] = [];

  try {
    product = await catalogApi.getProductBySlug(slug);
    if (product) {
      try {
        const reviewData = await catalogApi.getProductReviews(slug);
        reviews = reviewData.items;
      } catch {
        reviews = [];
      }
    }
  } catch {
    // If backend is not reached, try fallback
    product = FALLBACK_DETAIL[slug] || null;
  }

  if (!product && FALLBACK_DETAIL[slug]) {
    product = FALLBACK_DETAIL[slug];
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FBF7F2] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Heritage Breadcrumb ────────────────────────────────────────────── */}
        <nav className="flex items-center space-x-2 text-[10px] sm:text-xs text-[#3A3028]/60 mb-6 font-medium tracking-[0.1em] uppercase" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/products" className="hover:text-[var(--color-primary)] transition-colors">
            Sweets
          </Link>
          {product.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-[var(--color-primary)] font-bold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Product Detail Interactive View */}
        <ProductDetailView product={product} reviews={reviews} />
      </div>
    </div>
  );
}
