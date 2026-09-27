import Link from "next/link";
import { ArrowRight, Sparkles, Gift, ShieldCheck, HeartHandshake, Tag, Flame } from "lucide-react";
import { catalogApi, bannerApi, offerApi, ProductListItem, BannerModel, OfferModel } from "@/lib/api-client";
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
  },
  {
    title: "Dry Fruit Mithai",
    slug: "dry-fruit-sweets",
    emoji: "💎",
    desc: "Shahi Kaju Katli, Pista Rolls & Fig Barfi",
  },
  {
    title: "Bengali Chhena",
    slug: "bengali-sweets",
    emoji: "✨",
    desc: "Spongy Rasgulla, Sandesh, Cham Cham & Rasmalai",
  },
  {
    title: "Savouries & Namkeen",
    slug: "savouries",
    emoji: "🌶️",
    desc: "Crispy Mathri, Dalmoth, Samosa & Khasta Kachori",
  },
];

export default async function HomePage() {
  let products = FALLBACK_PRODUCTS;
  let banners: BannerModel[] = [];
  let offers: OfferModel[] = [];

  try {
    const [prodRes, bannerRes, offerRes] = await Promise.allSettled([
      catalogApi.getProducts({ is_featured: true, page_size: 4 }),
      bannerApi.listActive(),
      offerApi.listActive(),
    ]);

    if (prodRes.status === "fulfilled" && prodRes.value?.items && prodRes.value.items.length > 0) {
      products = prodRes.value.items;
    }
    if (bannerRes.status === "fulfilled" && Array.isArray(bannerRes.value)) {
      banners = bannerRes.value;
    }
    if (offerRes.status === "fulfilled" && Array.isArray(offerRes.value)) {
      offers = offerRes.value;
    }
  } catch {
    // Graceful fallback to static curation if backend is not yet booted
    products = FALLBACK_PRODUCTS;
  }

  return (
    <main>
      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5EFEB] to-[#FBF7F2] py-16 md:py-24 border-b border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#8A1538]/10 text-[#8A1538] px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                Barabanki&apos;s Iconic Sweetshop Since Inception
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1F1B16] leading-[1.15] tracking-tight">
                Authentic Mithai, Crafted in <span className="text-[#8A1538]">Pure Desi Ghee</span>
              </h1>

              <p className="text-base sm:text-lg text-[#6B6258] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Indulge in time-honored Indian sweets made daily with pure cow milk, premium saffron, and slow-churned artisanal ghee. From festive celebrations to family tea-time moments.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[#8A1538] hover:bg-[#6E1030] text-white px-7 py-3.5 rounded-2xl text-base font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Order Sweets Online
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/products?category=gift-hampers"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F5EFEB] text-[#1F1B16] border border-[#E8E0D8] px-7 py-3.5 rounded-2xl text-base font-semibold transition-all"
                >
                  <Gift className="w-4 h-4 text-[#C9A227]" />
                  Festive Gift Boxes
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#E8E0D8]/80 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <span className="font-serif text-xl sm:text-2xl font-bold text-[#8A1538] block">100%</span>
                  <span className="text-xs text-[#6B6258] font-medium">Pure Desi Ghee</span>
                </div>
                <div>
                  <span className="font-serif text-xl sm:text-2xl font-bold text-[#8A1538] block">Fresh</span>
                  <span className="text-xs text-[#6B6258] font-medium">Prepared Daily</span>
                </div>
                <div>
                  <span className="font-serif text-xl sm:text-2xl font-bold text-[#8A1538] block">Same-Day</span>
                  <span className="text-xs text-[#6B6258] font-medium">Barabanki Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Collage */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=85"
                  alt="Celebration of traditional Indian sweets by Saraswati Sweets"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B16]/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Chef&apos;s Signature</span>
                  <h3 className="font-serif text-2xl font-bold mt-1">Shahi Gulab Jamun & Chhena</h3>
                  <p className="text-xs text-[#E8E0D8] mt-1">Simmered in slow earthen fires and organic rose extract</p>
                </div>
              </div>

              {/* Floating Award Pill */}
              <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E8E0D8] shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Barabanki&apos;s Most Trusted</p>
                  <p className="text-[11px] text-[#6B6258]">Over 5,000+ Celebrations Served</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Offers & Festive Banners ───────────────────────────────────── */}
      {(banners.length > 0 || offers.length > 0) && (
        <section className="py-8 bg-amber-50/60 border-b border-amber-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Offers Ticker / Badges */}
            {offers.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8A1538] bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Special Offers
                </div>
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-[#E8E0D8] text-xs font-medium text-[#1F1B16] shadow-sm"
                  >
                    <Tag className="w-3 h-3 text-[#8A1538]" />
                    <span className="font-bold text-[#8A1538]">{offer.title}</span>
                    {offer.description && (
                      <span className="text-[#6B6258] hidden sm:inline">— {offer.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Banners Grid */}
            {banners.length > 0 && (
              <div className={`grid gap-4 ${banners.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                {banners.map((b) => {
                  const targetUrl =
                    b.link_type === "CATEGORY"
                      ? `/products?category=${b.link_value || ""}`
                      : b.link_type === "PRODUCT"
                      ? `/products/${b.link_value || ""}`
                      : "/products";

                  return (
                    <Link
                      key={b.id}
                      href={targetUrl}
                      className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#E8E0D8] aspect-[21/9] sm:aspect-[24/9] flex items-center"
                    >
                      <img
                        src={b.image_url}
                        alt={b.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1F1B16]/85 via-[#1F1B16]/40 to-transparent" />
                      <div className="relative p-6 sm:p-8 text-white max-w-md">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A227] block mb-1">
                          Festive Announcement
                        </span>
                        <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight drop-shadow-sm group-hover:text-amber-200 transition-colors">
                          {b.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 mt-3 group-hover:translate-x-1 transition-transform">
                          Shop Now <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Categories Section ────────────────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A1538]">Curated Mithai Range</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1B16] mt-1">
              Explore Our Sweet Categories
            </h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A1538] hover:text-[#6E1030] group"
          >
            View All Categories
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES_DATA.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group bg-white p-6 rounded-2xl border border-[#E8E0D8] hover:border-[#8A1538]/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">
                  {cat.emoji}
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1F1B16] group-hover:text-[#8A1538] transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-[#6B6258] mt-2 leading-relaxed">
                  {cat.desc}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-[#8A1538]">
                <span>Browse Sweets</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bestseller Products ───────────────────────────────────────────────── */}
      <section className="py-16 bg-[#F5EFEB]/50 border-y border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8A1538]">Handmade Masterpieces</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1B16] mt-1">
                Featured Sweets & Delicacies
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A1538] hover:text-[#6E1030] group"
            >
              Browse Complete Menu
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
        <div className="bg-[#8A1538] text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Subtle Decorative Pattern */}
          <div className="absolute right-0 top-0 opacity-10 text-9xl pointer-events-none select-none font-serif">
            🪷
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block bg-[#C9A227] text-[#1F1B16] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
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
                href="/bulk-enquiry"
                className="bg-white hover:bg-[#F5EFEB] text-[#8A1538] px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Submit Bulk Enquiry
              </Link>

              <Link
                href="/products?category=gift-hampers"
                className="border border-white/60 hover:border-white text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              >
                View Pre-packed Hampers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand Heritage Values ─────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-t border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center mx-auto text-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#1F1B16]">Zero Preservatives</h4>
              <p className="text-xs text-[#6B6258] max-w-xs mx-auto">
                No artificial stabilizers, chemical coloring, or adulterated essences. Pure freshness always.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center mx-auto text-xl">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#1F1B16]">Local Dairy Sourcing</h4>
              <p className="text-xs text-[#6B6258] max-w-xs mx-auto">
                Direct procurement of milk and khoya from trusted rural dairy cooperatives around Barabanki.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center mx-auto text-xl">
                <Sparkles className="w-6 h-6 text-[#C9A227]" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#1F1B16]">Guaranteed Taste</h4>
              <p className="text-xs text-[#6B6258] max-w-xs mx-auto">
                Every batch sampled and supervised by veteran sweetmakers before reaching our storefront counters.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
