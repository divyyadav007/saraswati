import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Saraswati Sweets — Premium Indian Mithai | Barabanki",
    template: "%s | Saraswati Sweets",
  },
  description:
    "Order authentic Indian sweets online from Saraswati Sweets, Barabanki. Fresh mithai, gift hampers, and festival collections delivered to your door.",
  keywords: ["Indian sweets", "mithai", "Barabanki", "sweets delivery", "gift hampers"],
  authors: [{ name: "Saraswati Sweets" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Saraswati Sweets",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8A1538",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
