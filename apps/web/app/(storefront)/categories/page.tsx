import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { catalogApi, Category } from "@/lib/api-client";

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "c-1",
    name: "Traditional Sweets (Ghee)",
    slug: "traditional-sweets",
    description: "Classic milk and gram-flour sweets fried in 100% pure desi ghee. Gulab Jamun, Motichoor Laddoo, Besan Barfi & Imarti.",
    image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
    parent_id: null,
    display_order: 1,
    is_active: true,
  },
  {
    id: "c-2",
    name: "Dry Fruit & Kaju Mithai",
    slug: "dry-fruit-sweets",
    description: "Opulent cashew, almond, and pistachio sweets with edible vark silver leaf. Shahi Kaju Katli, Kaju Roll & Anjeer Barfi.",
    image_url: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80",
    parent_id: null,
    display_order: 2,
    is_active: true,
  },
  {
    id: "c-3",
    name: "Bengali Chhena Delicacies",
    slug: "bengali-sweets",
    description: "Light, melt-in-the-mouth cottage cheese sweets. Spongy Rasgulla, Kesar Rajbhog, Malai Sandesh & Rasmalai.",
    image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80",
    parent_id: null,
    display_order: 3,
    is_active: true,
  },
  {
    id: "c-4",
    name: "Savouries & Mathri",
    slug: "savouries",
    description: "Crispy, flaky namkeens spiced with ajwain, black pepper, and hing. Mathri, Khasta Kachori, Dalmoth & Bhujia.",
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    parent_id: null,
    display_order: 4,
    is_active: true,
  },
  {
    id: "c-5",
    name: "Festive Gift Hampers",
    slug: "gift-hampers",
    description: "Luxurious handcrafted gift boxes containing assorted mithai, dry fruits, and festive packaging for Diwali, Holi & Weddings.",
    image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80",
    parent_id: null,
    display_order: 5,
    is_active: true,
  },
];

export default async function CategoriesPage() {
  let categories = FALLBACK_CATEGORIES;

  try {
    const data = await catalogApi.getCategories();
    if (data && data.length > 0) {
      categories = data;
    }
  } catch {
    categories = FALLBACK_CATEGORIES;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb & Header */}
      <div className="mb-10 text-center sm:text-left">
        <nav className="flex items-center justify-center sm:justify-start gap-2 text-xs text-[var(--color-text-muted)] mb-2 font-medium" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--color-text-primary)]" aria-current="page">Categories</span>
        </nav>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
          Mithai Collections &amp; Categories
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-2 max-w-2xl">
          Browse our curated range of authentic Indian sweets, dry fruit delicacies, and festive hampers.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            aria-label={`Browse ${cat.name}`}
          >
            <div>
              <div className="relative aspect-video bg-[var(--color-surface-raised)] overflow-hidden">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden="true">
                    🪷
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B16]/60 via-transparent to-transparent flex items-end p-5">
                  <span className="bg-[var(--color-primary)] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Collection
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h2 className="font-serif text-2xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-2 line-clamp-3 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-[var(--color-surface-raised)] mt-4 flex items-center justify-between text-sm font-semibold text-[var(--color-primary)]">
              <span>Explore Sweets</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
