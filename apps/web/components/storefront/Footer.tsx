import Link from "next/link";
import { Phone, MapPin, Clock, Heart, Award, Truck, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1F1B16] text-[#E8E0D8] border-t border-[#362E27] mt-20">
      {/* Quality Promises */}
      <div className="border-b border-[#362E27] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#8A1538]/30 border border-[#8A1538] flex items-center justify-center shrink-0 text-[#C9A227]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-semibold text-white">Pure Desi Ghee</h4>
              <p className="text-sm text-[#9E948A] mt-0.5">Prepared exclusively using high-grade clarified butter with zero adulteration.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#8A1538]/30 border border-[#8A1538] flex items-center justify-center shrink-0 text-[#C9A227]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-semibold text-white">Handcrafted Heritage</h4>
              <p className="text-sm text-[#9E948A] mt-0.5">Authentic recipes passed down through generations by master halwais.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#8A1538]/30 border border-[#8A1538] flex items-center justify-center shrink-0 text-[#C9A227]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-semibold text-white">Fresh Local Delivery</h4>
              <p className="text-sm text-[#9E948A] mt-0.5">Fast, hygienic door-to-door delivery across Barabanki with temperature care.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪷</span>
            <span className="font-serif text-2xl font-bold text-white tracking-tight">
              Saraswati Sweets
            </span>
          </div>
          <p className="text-sm text-[#9E948A] leading-relaxed">
            The traditional sweetshop destination of Barabanki. Crafting celebrated celebratory sweets, dry fruit mithai, and festive hampers since inception.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-[#C9A227]">
            <Heart className="w-4 h-4 fill-current text-[#8A1538]" />
            <span>Made with devotion in Uttar Pradesh</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-serif text-base font-semibold text-white mb-4 tracking-wide uppercase text-xs text-[#C9A227]">
            Our Sweets
          </h4>
          <ul className="space-y-2.5 text-sm text-[#9E948A]">
            <li>
              <Link href="/products?category=traditional-sweets" className="hover:text-white transition-colors">
                Traditional Sweets (Ghee)
              </Link>
            </li>
            <li>
              <Link href="/products?category=dry-fruit-sweets" className="hover:text-white transition-colors">
                Kaju & Dry Fruit Mithai
              </Link>
            </li>
            <li>
              <Link href="/products?category=bengali-sweets" className="hover:text-white transition-colors">
                Bengali Chhena Delicacies
              </Link>
            </li>
            <li>
              <Link href="/products?category=savouries" className="hover:text-white transition-colors">
                Namkeen & Savouries
              </Link>
            </li>
            <li>
              <Link href="/products?category=gift-hampers" className="hover:text-white transition-colors">
                Festive Gift Boxes
              </Link>
            </li>
          </ul>
        </div>

        {/* Information */}
        <div>
          <h4 className="font-serif text-base font-semibold text-white mb-4 tracking-wide uppercase text-xs text-[#C9A227]">
            Customer Support
          </h4>
          <ul className="space-y-2.5 text-sm text-[#9E948A]">
            <li>
              <Link href="/bulk-enquiry" className="hover:text-white transition-colors">
                Bulk & Corporate Orders
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Store Location & Timings
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className="hover:text-white transition-colors text-xs text-[#9E948A]/80">
                Staff / Admin Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Store Timings & Address */}
        <div>
          <h4 className="font-serif text-base font-semibold text-white mb-4 tracking-wide uppercase text-xs text-[#C9A227]">
            Visit Our Store
          </h4>
          <div className="space-y-3 text-sm text-[#9E948A]">
            <p className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <span>Main Market Road, Barabanki, Uttar Pradesh 225001</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#C9A227] shrink-0" />
              <span>8:00 AM – 10:00 PM (All 7 Days)</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#C9A227] shrink-0" />
              <span>+91 98765 43210</span>
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
