import { Navbar } from "@/components/storefront/Navbar";
import { Footer } from "@/components/storefront/Footer";
import { CartProvider } from "@/lib/cart-context";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-[#FBF7F2]">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </CartProvider>
  );
}
