"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Sales Reports", href: "/admin/reports", icon: "📈" },
  { name: "Orders", href: "/admin/orders", icon: "📦" },
  { name: "Products", href: "/admin/products", icon: "🍬" },
  { name: "Categories", href: "/admin/categories", icon: "📁" },
  { name: "Gift Hampers", href: "/admin/gift-hampers", icon: "🎁" },
  { name: "Bulk Enquiries", href: "/admin/bulk-enquiries", icon: "📋" },
  { name: "Coupons", href: "/admin/coupons", icon: "🏷️" },
  { name: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { name: "Delivery Partners", href: "/admin/delivery-partners", icon: "🛵" },
  { name: "Customers", href: "/admin/customers", icon: "👥" },
  { name: "Store Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-sans text-stone-900">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#8A1538] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🪔</span>
          <span className="font-serif font-bold text-lg">Saraswati Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded bg-maroon-800 text-stone-200 hover:text-white"
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#8A1538] text-white flex flex-col transition-transform transform md:translate-x-0 md:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-rose-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A227] text-maroon-900 flex items-center justify-center font-bold text-xl shadow-inner">
              S
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg text-amber-100 leading-tight">
                Saraswati Admin
              </h1>
              <p className="text-xs text-rose-200/80">Barabanki Sweets & Dryfruits</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.badge ? "#" : item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#C9A227] text-stone-900 shadow-md font-semibold"
                    : "text-rose-100/90 hover:bg-rose-900/50 hover:text-white"
                } ${item.badge ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 text-amber-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Storefront Link & Admin Status */}
        <div className="p-4 border-t border-rose-900/40 bg-rose-950/30">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-lg border border-amber-300/30 text-amber-200 hover:bg-rose-900/50 text-xs font-medium transition-colors"
          >
            <span>🏪</span>
            <span>View Public Storefront</span>
          </Link>
          <div className="mt-3 text-[11px] text-rose-300/70 text-center">
            Role: Store Admin • Phase 2
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <div className="bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-800">
              Catalogue Management
            </h2>
            <p className="text-xs text-stone-500">
              Manage products, weight variants, pricing, and categories
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Live Database Connected
            </span>
          </div>
        </div>

        {/* Page Inner Content */}
        <div className="p-6 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
