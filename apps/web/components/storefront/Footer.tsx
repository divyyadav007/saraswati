import Link from "next/link";
import { Phone, MapPin, Clock, Heart, Award, Truck, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1F1B16] text-[#E8E0D8] border-t border-[#362E27] mt-20" aria-label="Site footer">
      {/* Quality Promises Strip */}
      <div className="border-b border-white/10 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[var(--color-accent-gold)]"
                style={{ backgroundColor: "rgba(138,21,56,0.25)", border: "1px solid var(--color-primary)" }}
              >
                {item.icon}
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-white">{item.title}</h4>
                <p className="text-sm mt-0.5 text-[#9E948A]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">🪷</span>
            <span className="font-serif text-2xl font-bold text-white tracking-tight">
              Saraswati Sweets
            </span>
          </div>
          <p className="text-sm text-[#9E948A] leading-relaxed">
            The traditional sweetshop destination of Barabanki. Crafting celebrated celebratory sweets, dry fruit mithai, and festive hampers since inception.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-[var(--color-accent-gold)]">
            <Heart className="w-4 h-4 fill-current text-[var(--color-primary)]" aria-hidden="true" />
            <span>Made with devotion in Uttar Pradesh</span>
          </div>
        </div>

        {/* Our Sweets */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-accent-gold)] mb-4">
            Our Sweets
          </h4>
          <ul className="space-y-2.5 text-sm text-[#9E948A]">
            {[
              { href: "/products?category=traditional-sweets", label: "Traditional Sweets (Ghee)" },
              { href: "/products?category=dry-fruit-sweets", label: "Kaju & Dry Fruit Mithai" },
              { href: "/products?category=bengali-sweets", label: "Bengali Chhena Delicacies" },
              { href: "/products?category=savouries", label: "Namkeen & Savouries" },
              { href: "/products?category=gift-hampers", label: "Festive Gift Boxes" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Support */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-accent-gold)] mb-4">
            Customer Support
          </h4>
          <ul className="space-y-2.5 text-sm text-[#9E948A]">
            <li>
              <Link href="/bulk-enquiries" className="hover:text-white transition-colors">
                Bulk &amp; Corporate Orders
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Store Location &amp; Timings
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className="hover:text-white transition-colors text-xs opacity-70">
                Staff / Admin Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Store Timings & Address */}
        <div>
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-accent-gold)] mb-4">
            Visit Our Store
          </h4>
          <div className="space-y-3 text-sm text-[#9E948A]">
            <p className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[var(--color-accent-gold)] shrink-0 mt-0.5" aria-hidden="true" />
              <span>Main Market Road, Barabanki, Uttar Pradesh 225001</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[var(--color-accent-gold)] shrink-0" aria-hidden="true" />
              <span>8:00 AM – 10:00 PM (All 7 Days)</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[var(--color-accent-gold)] shrink-0" aria-hidden="true" />
              <a href="tel:+919876543210" className="hover:text-white transition-colors">
                +91 98765 43210
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#362E27] py-6 px-4 text-center text-xs text-[#6B6258]">
        © {new Date().getFullYear()} Saraswati Sweets. All rights reserved. Authentic flavors, pure ingredients.
      </div>
    </footer>
  );
}
