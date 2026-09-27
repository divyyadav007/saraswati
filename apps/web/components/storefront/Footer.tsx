import Link from "next/link";
import { Phone, MapPin, Clock, Heart, Award, Truck, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-t border-[var(--color-border-strong)] mt-20" aria-label="Site footer">
      {/* Quality Promises Strip */}
      <div className="border-b border-[var(--color-border-strong)] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {[
            {
              icon: <Sparkles className="w-6 h-6" />,
              title: "Pure Desi Ghee",
              desc: "Prepared exclusively using high-grade clarified butter with zero adulteration.",
            },
            {
              icon: <Award className="w-6 h-6" />,
              title: "Handcrafted Heritage",
              desc: "Authentic recipes passed down through generations by master halwais.",
            },
            {
              icon: <Truck className="w-6 h-6" />,
              title: "Fresh Local Delivery",
              desc: "Fast, hygienic door-to-door delivery across Barabanki with temperature care.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col md:flex-row items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[var(--color-primary)]"
                style={{ backgroundColor: "rgba(160,36,56,0.1)", border: "1px solid rgba(160,36,56,0.3)" }}
              >
                {item.icon}
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-[var(--color-text-primary)]">{item.title}</h4>
                <p className="text-sm mt-0.5 text-[var(--color-text-muted)]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4">
          <Link href="/" className="inline-block" aria-label="Saraswati Sweets Home">
            <img 
              src="/logo.png?v=3" 
              alt="Saraswati Sweets" 
              className="w-[140px] md:w-[160px] h-auto object-contain" 
            />
          </Link>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            The traditional sweetshop destination of Barabanki. Crafting celebrated celebratory sweets, dry fruit mithai, and festive hampers since inception.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
            <Heart className="w-4 h-4 fill-current text-[var(--color-primary)]" aria-hidden="true" />
            <span>Made with devotion in Uttar Pradesh</span>
          </div>
        </div>

        {/* Our Sweets */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-4">
            Our Sweets
          </h4>
          <ul className="space-y-2.5 text-sm text-[var(--color-text-muted)]">
            {[
              { href: "/products?category=traditional-sweets", label: "Traditional Sweets (Ghee)" },
              { href: "/products?category=dry-fruit-sweets", label: "Kaju & Dry Fruit Mithai" },
              { href: "/products?category=bengali-sweets", label: "Bengali Chhena Delicacies" },
              { href: "/products?category=savouries", label: "Namkeen & Savouries" },
              { href: "/products?category=gift-hampers", label: "Festive Gift Boxes" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-[var(--color-primary)] transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Support */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-4">
            Customer Support
          </h4>
          <ul className="space-y-2.5 text-sm text-[var(--color-text-muted)]">
            <li>
              <Link href="/bulk-enquiries" className="hover:text-[var(--color-primary)] transition-colors">
                Bulk &amp; Corporate Orders
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[var(--color-primary)] transition-colors">
                Store Location &amp; Timings
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className="hover:text-[var(--color-primary)] transition-colors text-xs opacity-80">
                Staff / Admin Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Store Timings & Address */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-4">
            Visit Our Store
          </h4>
          <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
              <span>Main Market Road, Barabanki, Uttar Pradesh 225001</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <span>8:00 AM – 10:00 PM (All 7 Days)</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <a href="tel:+919876543210" className="hover:text-[var(--color-primary)] transition-colors">
                +91 98765 43210
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--color-border-strong)] py-6 px-4 text-center text-xs text-[var(--color-text-muted)]">
        © {new Date().getFullYear()} Saraswati Sweets. All rights reserved. Authentic flavors, pure ingredients.
      </div>

      {/* Heritage Panoramic Footer Illustration */}
      <div className="relative w-full overflow-hidden leading-none flex border-none outline-none">
        {/* Soft feathered fade at the top boundary */}
        <div 
          className="absolute top-0 left-0 w-full h-8 md:h-16 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, #F3EBDD 0%, rgba(243,235,221,0.95) 15%, rgba(243,235,221,0.55) 40%, rgba(243,235,221,0.15) 70%, transparent 100%)"
          }}
        ></div>
        <img 
          src="/bottom_banner.png" 
          alt="Saraswati Sweets Heritage"
          className="w-full h-[140px] md:h-auto object-cover object-bottom block relative z-0"
          loading="lazy"
        />
      </div>
    </footer>
  );
}
