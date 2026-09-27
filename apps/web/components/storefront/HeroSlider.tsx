"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=1600&auto=format&fit=crop&q=85",
    eyebrow: "Freshly Made Daily • Trusted in Barabanki",
    title: "Barabanki Ki Apni Mithaas",
    desc: "Traditional sweets, festive hampers and everyday favourites, freshly prepared and delivered with care.",
    primaryCta: { label: "Shop Sweets", href: "/products" },
    secondaryCta: { label: "Explore Gift Hampers", href: "/gift-hampers" },
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1583089892943-e02e5ee6be9d?w=1600&auto=format&fit=crop&q=85",
    eyebrow: "Premium Wedding Gifting",
    title: "Celebrate with Saraswati",
    desc: "Make your special occasions memorable with our customized bhaji boxes and premium wedding hampers.",
    primaryCta: { label: "Wedding Orders", href: "/bulk-enquiries" },
    secondaryCta: { label: "View Hampers", href: "/gift-hampers" },
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1605197584547-c93439b8bc6d?w=1600&auto=format&fit=crop&q=85",
    eyebrow: "Festive Collection",
    title: "The Joy of Gifting",
    desc: "Spread happiness this festive season with our handcrafted mithai assortments and dry fruit boxes.",
    primaryCta: { label: "Shop Sweets", href: "/products" },
    secondaryCta: { label: "Corporate Gifting", href: "/bulk-enquiries" },
  }
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);

  return (
    <section className="relative w-full h-[85vh] min-h-[600px] flex items-end sm:items-center justify-center -mt-[121px] pb-16 sm:pb-0 overflow-hidden">
      {BANNERS.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={banner.image}
            alt={banner.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/80"></div>
        </div>
      ))}

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-32 sm:mt-24">
        {BANNERS.map((banner, index) => (
          <div
            key={banner.id}
            className={`transition-all duration-1000 ${
              index === currentSlide
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8 absolute inset-0 pointer-events-none"
            }`}
          >
            {index === currentSlide && (
              <>
                <span className="inline-block py-1 px-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white/90 text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase mb-6 shadow-sm">
                  {banner.eyebrow}
                </span>
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight drop-shadow-lg">
                  {banner.title}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/95 mb-10 max-w-xl mx-auto font-medium drop-shadow-md leading-relaxed">
                  {banner.desc}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    href={banner.primaryCta.href}
                    className="w-full sm:w-auto inline-flex items-center justify-center bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-foreground)] px-8 py-3.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all tracking-wide uppercase"
                  >
                    {banner.primaryCta.label}
                  </Link>
                  <Link
                    href={banner.secondaryCta.href}
                    className="w-full sm:w-auto inline-flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-[#3A3028] backdrop-blur-sm border border-white/30 px-8 py-3.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all tracking-wide uppercase"
                  >
                    {banner.secondaryCta.label}
                  </Link>
                </div>
              </>
            )}
          </div>
        ))}
        
        <div className="mt-12 flex justify-center items-center gap-3">
          {BANNERS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide ? "w-8 h-1.5 bg-[var(--color-primary)]" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all z-20 hidden md:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all z-20 hidden md:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </section>
  );
}
