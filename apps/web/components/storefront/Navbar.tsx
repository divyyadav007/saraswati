"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, Menu, X, ShieldCheck, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function Navbar() {
  const router = useRouter();
  const { itemsCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FBF7F2]/95 backdrop-blur-md border-b border-[#E8E0D8]">
      {/* Top Banner */}
      <div className="bg-[#8A1538] text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        ✨ 100% Pure Desi Ghee Mithai · Handcrafted Fresh Daily in Barabanki · Same-Day Local Delivery
      </div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-11 h-11 rounded-full bg-[#8A1538] text-white flex items-center justify-center text-xl shadow-md transition-transform group-hover:scale-105">
            🪷
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[#1F1B16] block leading-none">
              Saraswati
            </span>
            <span className="text-[11px] tracking-[0.2em] uppercase text-[#8A1538] font-semibold block mt-0.5">
              Sweets & Mithai
            </span>
          </div>
        </Link>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <input
            type="search"
            placeholder="Search Kaju Katli, Gulab Jamun, Laddoo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E8E0D8] rounded-full py-2.5 pl-11 pr-4 text-sm text-[#1F1B16] placeholder-[#6B6258] focus:border-[#8A1538] focus:ring-1 focus:ring-[#8A1538] outline-none shadow-xs transition-all"
          />
          <Search className="w-4 h-4 text-[#6B6258] absolute left-4 top-1/2 -translate-y-1/2" />
        </form>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#1F1B16]">
          <Link href="/products" className="hover:text-[#8A1538] transition-colors">
            All Sweets
          </Link>
          <Link href="/categories" className="hover:text-[#8A1538] transition-colors">
            Categories
          </Link>
          <Link href="/gift-hampers" className="hover:text-[#8A1538] transition-colors flex items-center gap-1">
            <span className="text-[#C9A227]">🎁</span> Hampers
          </Link>
          <Link href="/bulk-enquiries" className="hover:text-[#8A1538] transition-colors">
            Bulk Orders
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Admin shortcut */}
          <Link
            href="/admin/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A1538] bg-[#8A1538]/10 hover:bg-[#8A1538]/15 px-3 py-1.5 rounded-full transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </Link>

          {/* Profile Shortcut */}
          <Link
            href="/profile"
            className="p-2.5 rounded-full hover:bg-white text-[#1F1B16] transition-colors border border-transparent hover:border-[#E8E0D8]"
            aria-label="My Account & Profile"
          >
            <User className="w-5 h-5 text-[#8A1538]" />
          </Link>

          {/* Cart Icon */}
          <Link
            href="/cart"
            className="relative p-2.5 rounded-full hover:bg-white text-[#1F1B16] transition-colors border border-transparent hover:border-[#E8E0D8]"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[#8A1538]" />
            {itemsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C9A227] text-[#1F1B16] rounded-full text-[10px] font-bold flex items-center justify-center animate-in zoom-in-75">
                {itemsCount > 9 ? "9+" : itemsCount}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-[#1F1B16] hover:bg-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E8E0D8] bg-[#FBF7F2] px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearch} className="relative mb-3">
            <input
              type="search"
              placeholder="Search sweets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8E0D8] rounded-full py-2 pl-10 pr-4 text-sm outline-none"
            />
            <Search className="w-4 h-4 text-[#6B6258] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </form>

          <div className="flex flex-col gap-2 font-medium text-sm">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white text-[#1F1B16]"
            >
              All Sweets
            </Link>
            <Link
              href="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white text-[#1F1B16]"
            >
              Categories
            </Link>
            <Link
              href="/gift-hampers"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white text-[#1F1B16]"
            >
              🎁 Gift Hampers
            </Link>
            <Link
              href="/bulk-enquiries"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white text-[#1F1B16]"
            >
              Bulk & Wedding Enquiries
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white text-[#1F1B16] flex items-center gap-2"
            >
              <span>👤</span> My Account &amp; Orders
            </Link>
            <Link
              href="/admin/products"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg bg-[#8A1538]/10 text-[#8A1538] font-semibold"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
