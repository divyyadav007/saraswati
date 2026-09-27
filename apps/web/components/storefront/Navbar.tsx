"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X, User, MapPin, ChevronDown, LogIn } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchInput = (e.target as HTMLFormElement).elements.namedItem("desktop-search") as HTMLInputElement;
    if (searchInput && searchInput.value.trim()) {
      router.push(`/products?q=` + encodeURIComponent(searchInput.value.trim()));
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchInput = (e.target as HTMLFormElement).elements.namedItem("mobile-search") as HTMLInputElement;
    if (searchInput && searchInput.value.trim()) {
      router.push(`/products?q=` + encodeURIComponent(searchInput.value.trim()));
      setMobileMenuOpen(false);
    }
  };

  const isTransparent = isHome && !scrolled && !mobileMenuOpen;

  const headerBg = isTransparent
    ? "bg-transparent border-transparent text-white"
    : "bg-[var(--color-surface-raised)]/95 backdrop-blur-md text-[var(--color-text-primary)] shadow-sm border-b border-[var(--color-border-strong)]";

  return (
    <header className={`sticky top-0 w-full z-50 transition-all duration-300 ${headerBg}`}>
      {/* Top Announcement Banner */}
      <div className="bg-[#1F1B16] text-[#E8E0D8] text-[10px] sm:text-xs py-2 px-4 font-medium tracking-wide flex justify-between items-center border-b border-[#3A3028]">
        <div className="flex-1 text-left sm:text-center">
          <span className="hidden sm:inline">Freshly Made Daily | </span>Trusted by Families in Barabanki
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#DDD2C3]">
          <Link href="/contact" className="hover:text-white transition-colors">Store Locations</Link>
          {isAuthenticated === null ? (
            <span className="w-16 h-3 animate-pulse bg-white/20 rounded"></span>
          ) : isAuthenticated ? (
            <Link href="/profile" className="hover:text-white transition-colors">My Account</Link>
          ) : (
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          )}
        </div>
      </div>

      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        {/* Left Side (Desktop) */}
        <div className="hidden lg:flex flex-1 items-center gap-6 text-sm font-semibold tracking-wide">
          <form onSubmit={handleSearch} className="relative flex items-center group">
            <Search className="w-4 h-4 mr-2" aria-hidden="true" />
            <input 
              name="desktop-search" 
              type="text" 
              placeholder="Search..." 
              className={`bg-transparent outline-none border-b border-transparent group-hover:border-current focus:border-current transition-all w-24 focus:w-40 placeholder-current opacity-70 focus:opacity-100 ${isTransparent ? 'text-white' : 'text-[#3A3028]'}`}
            />
          </form>
          <Link href="/products" className="hover:opacity-70 transition-opacity flex items-center gap-1">Shop <ChevronDown className="w-3 h-3" /></Link>
          <Link href="/gift-hampers" className="hover:opacity-70 transition-opacity">Premium Gift Hampers</Link>
        </div>

        {/* Center: Brand Logo */}
        <Link href="/" className="flex-1 lg:flex-none flex justify-center items-center group relative z-10" aria-label="Saraswati Sweets Home">
          <img 
            src="/logo.png?v=3" 
            alt="Saraswati Sweets" 
            className="w-[120px] md:w-[140px] lg:w-[170px] h-auto object-contain transition-transform duration-300 group-hover:scale-105" 
          />
        </Link>

        {/* Right Side (Desktop) */}
        <div className="hidden lg:flex flex-1 items-center justify-end gap-6 text-sm font-semibold tracking-wide">
          <Link href="/bulk-enquiries" className="hover:opacity-70 transition-opacity whitespace-nowrap">Bulk &amp; Corporate</Link>
          <Link href="/contact" className="hover:opacity-70 transition-opacity whitespace-nowrap">Store Location</Link>
          
          <div className="flex items-center gap-4 ml-2">
            {isAuthenticated === null ? (
              <div className="w-5 h-5 animate-pulse bg-current/20 rounded-full" />
            ) : isAuthenticated ? (
              <Link href="/profile" className="hover:opacity-70 transition-opacity" aria-label="My Account">
                <User className="w-5 h-5" aria-hidden="true" />
              </Link>
            ) : (
              <Link href="/login" className="hover:opacity-70 transition-opacity flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs" aria-label="Login">
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Login</span>
              </Link>
            )}
            <Link href="/cart" className="relative hover:opacity-70 transition-opacity" aria-label="Cart">
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {itemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-[var(--color-primary)] text-white shadow-sm">
                  {itemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile menu toggle & Cart (Mobile) */}
        <div className="flex lg:hidden items-center gap-4 flex-1 justify-end">
          <Link href="/cart" className="relative p-2" aria-label="Cart">
            <ShoppingBag className="w-5 h-5" aria-hidden="true" />
            {itemsCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center bg-[var(--color-primary)] text-white">
                {itemsCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-[500px] border-b border-[var(--color-border-strong)]" : "max-h-0"
        }`}
      >
        <div className="px-4 py-6 space-y-4">
          <form onSubmit={handleMobileSearch} className="relative">
            <input
              name="mobile-search"
              type="search"
              placeholder="Search sweets..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          <div className="flex flex-col gap-2 font-medium text-base">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[var(--color-border)]">Shop All Sweets</Link>
            <Link href="/gift-hampers" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[var(--color-border)]">Premium Gift Hampers</Link>
            <Link href="/bulk-enquiries" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[var(--color-border)]">Bulk &amp; Corporate Orders</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[var(--color-border)]">Store Locations</Link>
            {isAuthenticated === null ? (
              <div className="py-2"><div className="w-24 h-5 animate-pulse bg-current/10 rounded"></div></div>
            ) : isAuthenticated ? (
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="py-2">My Account</Link>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="py-2 font-bold text-[var(--color-primary)]">Login / Register</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
