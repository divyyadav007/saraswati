import Link from "next/link";
import { ArrowRight, Sparkles, Gift, ShieldCheck, HeartHandshake, MapPin, Clock } from "lucide-react";
import { catalogApi, ProductListItem } from "@/lib/api-client";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HeroSlider } from "@/components/storefront/HeroSlider";


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
    imageUrl: "https://images.unsplash.com/photo-1605197584547-c93439b8bc6d?w=400&auto=format&fit=crop&q=80",
    desc: "Desi Ghee Laddoos, Gulab Jamun & Classic Khoya Sweets",
  },
  {
    title: "Dry Fruit Mithai",
    slug: "dry-fruit-sweets",
    imageUrl: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=400&auto=format&fit=crop&q=80",
    desc: "Shahi Kaju Katli, Pista Rolls & Fig Barfi",
  },
  {
    title: "Bengali Chhena",
    slug: "bengali-sweets",
    imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=80",
    desc: "Spongy Rasgulla, Sandesh, Cham Cham & Rasmalai",
  },
  {
    title: "Savouries & Namkeen",
    slug: "savouries",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80",
    desc: "Crispy Mathri, Dalmoth, Samosa & Khasta Kachori",
  },
  {
    title: "Festive Hampers",
    slug: "gift-hampers",
    imageUrl: "https://images.unsplash.com/photo-1579893414006-8d5940562688?w=400&auto=format&fit=crop&q=80",
    desc: "Premium assortments in beautiful celebration boxes",
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
      <HeroSlider />

      {/* ── Categories Section ────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-labelledby="categories-heading">
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-12">
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
              <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
                Curated Mithai Range
              </span>
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C] sm:hidden"></span>
            </div>
            <h2 id="categories-heading" className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)]">
              Explore Our Sweet Categories
            </h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group"
          >
            View All Categories
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* Horizontal Category Showcase */}
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 overflow-x-auto sm:overflow-visible pb-8 sm:pb-0 snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          {CATEGORIES_DATA.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center shrink-0 w-[160px] sm:w-auto snap-center"
            >
              <div className="relative w-full aspect-square max-w-[180px] mx-auto rounded-full bg-[#F2E5CE] p-2.5 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.02]">
                {/* Decorative Inner Border */}
                <div className="absolute inset-2 border border-[#C6A87C]/40 rounded-full pointer-events-none" aria-hidden="true"></div>
                
                {/* Image Cutout */}
                <div className="absolute inset-3 rounded-full overflow-hidden flex items-center justify-center bg-white">
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.title} 
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
              
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors text-center mt-5 leading-tight px-2">
                {cat.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trust Section / Why Saraswati ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
            <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
              The Saraswati Promise
            </span>
            <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
            Made With Tradition. Served With Care.
          </h2>
          <div className="w-24 h-[2px] bg-[#DCA47C]/40 mx-auto mt-6 mb-12"></div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              {
                icon: "🌿",
                title: "Pure Ingredients",
                desc: "Prepared exclusively using high-grade clarified butter and carefully selected ingredients.",
              },
              {
                icon: "🔥",
                title: "Freshly Prepared",
                desc: "Made fresh in small batches every day by our master halwais to ensure perfect taste.",
              },
              {
                icon: "🎁",
                title: "Gift Ready",
                desc: "Beautiful, premium packaging designed to elevate every occasion and celebration.",
              },
              {
                icon: "🛵",
                title: "Fresh Delivery",
                desc: "Reliable, hygienic, and fast delivery right to your doorstep across Barabanki.",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-3xl mb-5 shadow-sm border border-[var(--color-border)]" aria-hidden="true">
                  {item.icon}
                </div>
                <h3 className="font-serif text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-[240px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bestseller Products ───────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-labelledby="products-heading">
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-12">
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
              <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
                Customer Favourites
              </span>
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C] sm:hidden"></span>
            </div>
            <h2 id="products-heading" className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)]">
              Most Loved at Saraswati
            </h2>
          </div>
          <Link
            href="/products?sort=popular"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group"
          >
            View All Bestsellers
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ── Occasion-Based Shopping ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
              <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
                Shop by Occasion
              </span>
              <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] mb-4">
              Celebrate With Saraswati
            </h2>
            <div className="w-24 h-[2px] bg-[#DCA47C]/40 mx-auto mt-6 mb-4"></div>
            <p className="text-base text-[var(--color-text-muted)] max-w-2xl mx-auto italic font-serif">
              Find the perfect assortment of sweets and savouries for your specific celebration.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Wedding Celebrations",
                image: "https://images.unsplash.com/photo-1583089892943-e02e5ee6be9d?w=600&auto=format&fit=crop&q=80",
                link: "/categories/weddings",
              },
              {
                title: "Puja & Prasad",
                image: "https://images.unsplash.com/photo-1605197584547-c93439b8bc6d?w=600&auto=format&fit=crop&q=80",
                link: "/categories/puja",
              },
              {
                title: "Festive Gifting",
                image: "https://images.unsplash.com/photo-1579893414006-8d5940562688?w=600&auto=format&fit=crop&q=80",
                link: "/gift-hampers",
              },
            ].map((occ) => (
              <Link key={occ.title} href={occ.link} className="group relative h-80 rounded-2xl overflow-hidden block">
                <img src={occ.image} alt={occ.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                  <h3 className="font-serif text-2xl font-bold text-white drop-shadow-md">
                    {occ.title}
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors group-hover:bg-[var(--color-primary)]">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Order Now or Plan Ahead ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order Now */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 sm:p-10 text-center shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-[#F2E5CE] rounded-full flex items-center justify-center text-2xl mb-6">🛵</div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-4">Craving Sweets?</h3>
            <p className="text-[var(--color-text-muted)] mb-8 flex-1">
              Order fresh mithai directly to your doorstep. We offer same-day delivery across Barabanki for all regular items.
            </p>
            <Link href="/products" className="w-full inline-flex items-center justify-center bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-8 py-3.5 rounded-xl font-semibold transition-all">
              Order Now
            </Link>
          </div>
          
          {/* Plan Ahead */}
          <div className="bg-[#F2E5CE] rounded-3xl p-8 sm:p-10 text-center shadow-sm flex flex-col items-center border border-[#DCA47C]/40">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl mb-6">📅</div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-4">Planning an Event?</h3>
            <p className="text-[var(--color-text-muted)] mb-8 flex-1">
              Weddings, corporate gifting, or large family functions? Let us help you plan the perfect sweet boxes in advance.
            </p>
            <Link href="/bulk-enquiries" className="w-full inline-flex items-center justify-center bg-[var(--color-text-primary)] hover:bg-black text-white px-8 py-3.5 rounded-xl font-semibold transition-all">
              Plan My Order
            </Link>
          </div>
        </div>
      </section>

      {/* ── Rooted in Barabanki (Brand Story) ─────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[var(--color-surface)] border-y border-[var(--color-border)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-1/2 relative">
              <div className="aspect-[4/5] rounded-t-[140px] rounded-b-3xl overflow-hidden relative">
                <img src="/bottom_banner.png" alt="Barabanki Heritage" className="w-full h-full object-cover object-left" />
                <div className="absolute inset-0 bg-[#3A3028]/10 mix-blend-multiply"></div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#F2E5CE] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-sm font-serif font-bold text-center text-[var(--color-text-primary)]">Trusted<br/>Quality</span>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2">
              <div className="flex items-center justify-start gap-3 mb-4">
                <span className="w-8 sm:w-16 h-[1px] bg-[#DCA47C]"></span>
                <span className="text-2xl sm:text-3xl font-cursive text-[var(--color-primary)] capitalize">
                  Our Story
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] mb-6 leading-tight">
                Rooted in Barabanki. Inspired by Awadh.
              </h2>
              <div className="space-y-4 text-base text-[var(--color-text-muted)] leading-relaxed mb-8 font-serif">
                <p>
                  At Saraswati Sweets, we believe that true sweetness comes from authenticity. For years, we have been crafting celebrated mithai and festive hampers, serving local families across Barabanki with unwavering dedication.
                </p>
                <p>
                  Our recipes are deeply influenced by traditional Awadhi sweet-making culture, relying on pure desi ghee, locally sourced dairy, and time-honored artisanal techniques. From everyday cravings to grand wedding celebrations, we are proud to bring Barabanki ki apni mithaas to your home.
                </p>
              </div>
              <Link href="/about" className="inline-flex items-center gap-2 text-[var(--color-primary)] font-semibold hover:text-[var(--color-primary-hover)] transition-colors group">
                Read our full story
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Order Fresh / Store Location ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-6">
          Order Fresh Sweets in Barabanki
        </h2>
        <p className="text-[var(--color-text-muted)] max-w-xl mx-auto mb-10">
          Visit our storefront or order online for fast, hygienic delivery right to your door.
        </p>
        
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-left max-w-3xl mx-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl flex items-start gap-4 w-full shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Main Storefront</h4>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Main Market Road<br/>Barabanki, Uttar Pradesh 225001
              </p>
            </div>
          </div>
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl flex items-start gap-4 w-full shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Opening Hours</h4>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Monday – Sunday<br/>8:00 AM – 10:00 PM
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
