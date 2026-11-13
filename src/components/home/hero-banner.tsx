"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Headphones, RotateCcw, ShieldCheck, Store } from "lucide-react";
import type { Banner } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

const FALLBACK_SLIDES: Banner[] = [
  {
    id: -1,
    title: "Handmade in Nigeria, delivered nationwide",
    subtitle: "Art, fashion, ceramics and home pieces from verified makers.",
    image: media.hero(1),
    cta_label: "Shop now",
    cta_url: "/shop",
    is_active: true,
  },
];

export function HeroBanner({ banners }: { banners: Banner[] }) {
  const hero = banners.filter((b) => b.is_active && (b.placement ?? "hero") === "hero");
  const slides = hero.length ? hero : FALLBACK_SLIDES;
  const side = banners.filter((b) => b.is_active && b.placement === "side").slice(0, 2);

  const [selected, setSelected] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1 }, [
    Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="pt-2 md:pt-4">
      <div className="container-atelier">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-3">
          <div className="relative min-w-0 overflow-hidden rounded-md bg-white" aria-roledescription="carousel" aria-label="Featured promotions">
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex touch-pan-y">
                {slides.map((banner, index) => (
                  <div key={banner.id} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}>
                    <div className="relative h-[180px] w-full sm:h-[260px] md:h-[320px] lg:h-[360px]">
                      <AppImage
                        src={banner.image}
                        alt=""
                        fill
                        priority={index === 0}
                        sizes="(max-width:1024px) 100vw, 900px"
                        frameClassName="absolute inset-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-burgundy-deep/85 via-burgundy-deep/40 to-transparent" />
                      <div className="absolute inset-0 flex items-center p-4 md:p-10">
                        <div className="max-w-[70%] text-white md:max-w-lg">
                          {index === 0 ? (
                            <h1 className="font-display text-xl leading-tight text-balance sm:text-2xl md:text-4xl">{banner.title}</h1>
                          ) : (
                            <h2 className="font-display text-xl leading-tight text-balance sm:text-2xl md:text-4xl">{banner.title}</h2>
                          )}
                          {banner.subtitle && (
                            <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-white/85 md:mt-2 md:text-sm">{banner.subtitle}</p>
                          )}
                          {banner.cta_url && (
                            <Link
                              href={banner.cta_url}
                              className="mt-3 inline-flex h-8 items-center rounded-md bg-crimson px-3.5 text-[13px] font-semibold text-white transition hover:bg-crimson-hover md:mt-5 md:h-10 md:px-5 md:text-sm"
                            >
                              {banner.cta_label || "Shop now"}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-burgundy shadow md:inline-flex"
                  onClick={() => emblaApi?.scrollPrev()}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-burgundy shadow md:inline-flex"
                  onClick={() => emblaApi?.scrollNext()}
                  aria-label="Next slide"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={i === selected}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={cn("h-1.5 rounded-full transition-all", i === selected ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white")}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Side column: two promo banners (admin "side" placement) or service promises */}
          <div className="hidden flex-col gap-3 lg:flex">
            {side.length === 2 ? (
              side.map((banner) => (
                <Link key={banner.id} href={banner.cta_url || "/shop"} className="group relative min-h-0 flex-1 overflow-hidden rounded-md bg-white">
                  <AppImage src={banner.image} alt={banner.title} fill sizes="260px" frameClassName="absolute inset-0" className="transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-burgundy-deep/85 to-transparent" />
                  <p className="absolute inset-x-0 bottom-0 p-3 font-display text-base leading-tight text-white">{banner.title}</p>
                </Link>
              ))
            ) : (
              <div className="flex flex-1 flex-col justify-between rounded-md bg-white p-4">
                {[
                  { icon: Headphones, title: "Customer care", text: "Real people, 7 days a week" },
                  { icon: ShieldCheck, title: "Secure payment", text: "Cards, transfer & USSD via Paystack" },
                  { icon: RotateCcw, title: "Easy returns", text: "7 days on eligible items" },
                  { icon: Store, title: "Sell on Atelier", text: "Open your store in minutes", href: "/become-a-vendor" },
                ].map(({ icon: Icon, title, text, href }) => {
                  const body = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-warm text-burgundy">
                        <Icon size={18} />
                      </span>
                      <span>
                        <span className="block text-[13px] font-semibold">{title}</span>
                        <span className="block text-[12px] text-muted">{text}</span>
                      </span>
                    </>
                  );
                  return href ? (
                    <Link key={title} href={href} className="flex items-center gap-3 rounded-md hover:text-burgundy">
                      {body}
                    </Link>
                  ) : (
                    <div key={title} className="flex items-center gap-3">
                      {body}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
