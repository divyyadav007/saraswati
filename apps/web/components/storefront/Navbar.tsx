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
    <header className="sticky top-0 z-50 bg-[#FBF7F2]/95 backdrop-blur-md border-b border-[var(--color-border)]">
      {/* Top Announcement Banner */}
      <div className="bg-[var(--color-primary)] text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        ✨ 100% Pure Desi Ghee Mithai · Handcrafted Fresh Daily in Barabanki · Same-Day Local Delivery
      </div>

      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group" aria-label="Saraswati Sweets — Home">
          <div className="w-11 h-11 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xl shadow-md transition-transform group-hover:scale-105">
            🪷
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[var(--color-text-primary)] block leading-none">
              Saraswati
            </span>
            <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--color-primary)] font-semibold block mt-0.5">
              Sweets &amp; Mithai
            </span>
          </div>
        </Link>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4 relative" role="search">
          <label htmlFor="desktop-search" className="sr-only">Search sweets</label>
          <input
            id="desktop-search"
            type="search"
            placeholder="Search Kaju Katli, Gulab Jamun, Laddoo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full py-2.5 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none shadow-sm"
          />
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        </form>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-[var(--color-text-primary)]">
          {[
            { href: "/products", label: "All Sweets" },
            { href: "/categories", label: "Categories" },
            { href: "/gift-hampers", label: "🎁 Hampers", gold: true },
            { href: "/bulk-enquiries", label: "Bulk Orders" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1 hover:text-[var(--color-primary)] transition-colors after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--color-primary)] hover:after:w-full after:transition-all after:duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Admin shortcut */}
          <Link
            href="/admin/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/15 px-3 py-1.5 rounded-full transition-colors"
            aria-label="Admin Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Admin
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="p-2.5 rounded-full hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-colors"
            aria-label="My Account &amp; Profile"
          >
            <User className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2.5 rounded-full hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-colors"
            aria-label={`View Cart — ${itemsCount} item${itemsCount !== 1 ? "s" : ""}`}
          >
            <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
            {itemsCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-[var(--color-accent-gold)] text-[var(--color-accent-gold-foreground)]"
                aria-hidden="true"
              >
                {itemsCount > 9 ? "9+" : itemsCount}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors text-[var(--color-text-primary)]"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu — slide animation via max-height transition */}
      <div
        id="mobile-nav"
        className={`lg:hidden border-t border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden transition-all duration-200 ${
          mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="px-4 pt-3 pb-6 space-y-2">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-4" role="search">
            <label htmlFor="mobile-search" className="sr-only">Search sweets</label>
            <input
              id="mobile-search"
              type="search"
              placeholder="Search sweets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </form>

          {/* Mobile Nav Links */}
          <div className="flex flex-col gap-0.5 font-medium text-sm">
            {[
              { href: "/products", label: "All Sweets" },
              { href: "/categories", label: "Categories" },
              { href: "/gift-hampers", label: "🎁 Gift Hampers" },
              { href: "/bulk-enquiries", label: "Bulk & Wedding Enquiries" },
              { href: "/profile", label: "👤 My Account & Orders" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/admin/products"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 px-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold mt-1 hover:bg-[var(--color-primary)]/15 transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

