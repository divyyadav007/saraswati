import Link from "next/link";
import { ArrowRight, Sparkles, Gift, ShieldCheck, HeartHandshake } from "lucide-react";
import { catalogApi, ProductListItem } from "@/lib/api-client";
import { ProductCard } from "@/components/storefront/ProductCard";


// Fallback products if backend is offline during initial static generation
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

const CATEGORIES_DATA = [
  {
    title: "Traditional Sweets",
    slug: "traditional-sweets",
    emoji: "🪷",
    desc: "Desi Ghee Laddoos, Gulab Jamun & Classic Khoya Sweets",
    color: "from-rose-50 to-pink-50",
  },
  {
    title: "Dry Fruit Mithai",
    slug: "dry-fruit-sweets",
    emoji: "💎",
    desc: "Shahi Kaju Katli, Pista Rolls & Fig Barfi",
    color: "from-amber-50 to-yellow-50",
  },
  {
    title: "Bengali Chhena",
    slug: "bengali-sweets",
    emoji: "✨",
    desc: "Spongy Rasgulla, Sandesh, Cham Cham & Rasmalai",
    color: "from-sky-50 to-blue-50",
  },
  {
    title: "Savouries & Namkeen",
    slug: "savouries",
    emoji: "🌶️",
    desc: "Crispy Mathri, Dalmoth, Samosa & Khasta Kachori",
    color: "from-orange-50 to-amber-50",
  },
];

export default async function HomePage() {
  let products = FALLBACK_PRODUCTS;

  try {
    const prodRes = await catalogApi.getProducts({ is_featured: true, page_size: 4 });
    if (prodRes?.items && prodRes.items.length > 0) {
      products = prodRes.items;
    }
  } catch {
    products = FALLBACK_PRODUCTS;
  }

  return (
    <main>

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5EFEB] to-[var(--color-background)] py-16 md:py-24 border-b border-[var(--color-border)]">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-accent-gold)]/8 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-gold)]" aria-hidden="true" />
                Barabanki&apos;s Iconic Sweetshop Since Inception
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] leading-[1.15] tracking-tight">
                Authentic Mithai, Crafted in{" "}
                <span className="text-[var(--color-primary)] relative">
                  Pure Desi Ghee
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[var(--color-accent-gold)]/60 rounded-full" aria-hidden="true" />
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Indulge in time-honored Indian sweets made daily with pure cow milk, premium saffron, and slow-churned artisanal ghee. From festive celebrations to family tea-time moments.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-7 py-3.5 rounded-2xl text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                >
                  Order Sweets Online
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>

                <Link
                  href="/gift-hampers"
                  className="inline-flex items-center justify-center gap-2 bg-[var(--color-surface)] hover:bg-[#F5EFEB] text-[var(--color-text-primary)] border border-[var(--color-border)] px-7 py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 hover:border-[var(--color-border-strong)]"
                >
                  <Gift className="w-4 h-4 text-[var(--color-accent-gold)]" aria-hidden="true" />
                  Festive Gift Boxes
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[var(--color-border)]/80 max-w-lg mx-auto lg:mx-0 text-left">
                {[
                  { stat: "100%", label: "Pure Desi Ghee" },
                  { stat: "Fresh", label: "Prepared Daily" },
                  { stat: "Same-Day", label: "Barabanki Delivery" },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[var(--color-primary)] block">{item.stat}</span>
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=85"
                  alt="Celebration of traditional Indian sweets by Saraswati Sweets"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B16]/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-xs uppercase tracking-widest text-[var(--color-accent-gold)] font-bold">Chef&apos;s Signature</span>
                  <h3 className="font-serif text-2xl font-bold mt-1">Shahi Gulab Jamun &amp; Chhena</h3>
                  <p className="text-xs text-[#E8E0D8] mt-1">Simmered in slow earthen fires and organic rose extract</p>
                </div>
              </div>

              {/* Floating Award Pill */}
              <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[var(--color-border)] shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent-gold)]/20 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">Barabanki&apos;s Most Trusted</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Over 5,000+ Celebrations Served</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories Section ────────────────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-labelledby="categories-heading">
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10">
          <div>
            <span className="section-eyebrow">Curated Mithai Range</span>
            <h2 id="categories-heading" className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mt-1">
              Explore Our Sweet Categories
            </h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] group"
          >
            View All Categories
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES_DATA.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <span className="text-4xl mb-4 block transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
                  {cat.emoji}
                </span>
                <h3 className="font-serif text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                  {cat.desc}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-[var(--color-primary)]">
                <span>Browse Sweets</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bestseller Products ───────────────────────────────────────────────── */}
      <section className="py-16 bg-[#F5EFEB]/50 border-y border-[var(--color-border)]" aria-labelledby="products-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10">
            <div>
              <span className="section-eyebrow">Handmade Masterpieces</span>
              <h2 id="products-heading" className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mt-1">
                Featured Sweets &amp; Delicacies
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] group"
            >
              Browse Complete Menu
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bulk & Corporate Gifting Banner ───────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--color-primary)] text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Decorative Pattern */}
          <div className="absolute right-0 top-0 opacity-10 text-9xl pointer-events-none select-none font-serif" aria-hidden="true">
            🪷
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="badge-gold">
              Weddings · Festivals · Corporate Gifting
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Order Custom Sweet Boxes for Your Special Occasions
            </h2>

            <p className="text-sm sm:text-base text-[#F5EFEB] leading-relaxed">
              Planning a wedding, festive celebration, or company gathering? Saraswati Sweets prepares personalized gift packaging with customized mithai assortments, ribbons, and greeting cards.
            </p>

            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                href="/bulk-enquiries"
                className="bg-[var(--color-surface)] hover:bg-[#F5EFEB] text-[var(--color-primary)] px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-md"
              >
                Submit Bulk Enquiry
              </Link>

              <Link
                href="/gift-hampers"
                className="border border-white/60 hover:border-white text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
              >
                View Pre-packed Hampers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand Heritage Values ─────────────────────────────────────────────── */}
      <section className="py-12 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Zero Preservatives",
                desc: "No artificial stabilizers, chemical coloring, or adulterated essences. Pure freshness always.",
              },
              {
                icon: <HeartHandshake className="w-6 h-6" />,
                title: "Local Dairy Sourcing",
                desc: "Direct procurement of milk and khoya from trusted rural dairy cooperatives around Barabanki.",
              },
              {
                icon: <Sparkles className="w-6 h-6 text-[var(--color-accent-gold)]" />,
                title: "Guaranteed Taste",
                desc: "Every batch sampled and supervised by veteran sweetmakers before reaching our storefront counters.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto" aria-hidden="true">
                  {item.icon}
                </div>
                <h4 className="font-serif text-lg font-bold text-[var(--color-text-primary)]">{item.title}</h4>
                <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
