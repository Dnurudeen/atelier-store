"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner, Category } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

export function HeroBanner({
  banners,
  categories = [],
}: {
  banners: Banner[];
  categories?: Category[];
}) {
  const activeBanners = banners.filter((b) => b.is_active);
  const [selected, setSelected] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5500, stopOnInteraction: false }),
  ]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (activeBanners.length === 0) return null;

  const current = activeBanners[selected] ?? activeBanners[0];
  const sideBanners = activeBanners.slice(1, 3);

  return (
    <section className="bg-[var(--page-bg)] pt-3 md:pt-4">
      <div className="container-atelier">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
          <aside className="hidden overflow-hidden rounded-md border border-border bg-white lg:block">
            <p className="border-b border-border px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Categories
            </p>
            <nav className="py-1">
              <Link
                href="/shop"
                className="flex items-center justify-between px-3 py-2 text-sm text-foreground/85 transition hover:bg-surface hover:text-burgundy"
              >
                All crafts
                <ChevronRight size={14} className="text-muted" />
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${category.slug}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground/85 transition hover:bg-surface hover:text-burgundy"
                >
                  <span className="truncate">{category.name}</span>
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                </Link>
              ))}
              <Link
                href="/makers"
                className="flex items-center justify-between px-3 py-2 text-sm text-foreground/85 transition hover:bg-surface hover:text-burgundy"
              >
                Maker stores
                <ChevronRight size={14} className="text-muted" />
              </Link>
            </nav>
          </aside>

          <div className="relative overflow-hidden rounded-md border border-border bg-white">
            <div className="relative aspect-[16/9] min-h-[210px] md:aspect-[21/9] md:min-h-[280px] md:max-h-[340px]">
              {activeBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-700",
                    index === selected ? "opacity-100" : "opacity-0"
                  )}
                >
                  <AppImage
                    src={banner.image}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="(max-width:1024px) 100vw, 70vw"
                    frameClassName="absolute inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
                </div>
              ))}

              <div className="absolute inset-0 z-10 flex items-end p-4 md:items-center md:p-8">
                <div className="max-w-xl text-white">
                  <p className="mb-1 text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase">
                    Atelier Nigeria
                  </p>
                  <h1 className="font-display text-[1.55rem] leading-tight text-balance md:text-4xl">
                    {current.title}
                  </h1>
                  {current.subtitle && (
                    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/85 md:text-sm">
                      {current.subtitle}
                    </p>
                  )}
                  {current.cta_url && current.cta_label && (
                    <Link
                      href={current.cta_url}
                      className="mt-4 inline-flex h-9 items-center rounded-md bg-crimson px-4 text-sm font-semibold text-white transition hover:bg-crimson-hover md:h-10 md:px-5"
                    >
                      {current.cta_label}
                    </Link>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="absolute top-1/2 left-2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-burgundy shadow-sm md:inline-flex"
                onClick={() => emblaApi?.scrollPrev()}
                aria-label="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="absolute top-1/2 right-2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-burgundy shadow-sm md:inline-flex"
                onClick={() => emblaApi?.scrollNext()}
                aria-label="Next slide"
              >
                <ChevronRight size={18} />
              </button>

              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                {activeBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selected ? "w-5 bg-crimson" : "w-1.5 bg-white/70 hover:bg-white"
                    )}
                  />
                ))}
              </div>
            </div>

            <div ref={emblaRef} className="sr-only" aria-hidden>
              <div className="flex">
                {activeBanners.map((banner) => (
                  <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
                    {banner.title}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden flex-col gap-3 lg:flex">
            {(sideBanners.length >= 2
              ? sideBanners
              : [
                  {
                    id: -1,
                    title: "Meet the makers",
                    subtitle: "Visit artisan storefronts",
                    image: media.hero(2),
                    cta_url: "/makers",
                    cta_label: "Explore",
                    is_active: true,
                  },
                  {
                    id: -2,
                    title: "Sell your craft",
                    subtitle: "Open a maker store",
                    image: media.hero(3),
                    cta_url: "/become-a-vendor",
                    cta_label: "Join",
                    is_active: true,
                  },
                ]
            ).map((banner) => (
              <Link
                key={banner.id}
                href={banner.cta_url || "/shop"}
                className="group relative min-h-[134px] flex-1 overflow-hidden rounded-md border border-border bg-white"
              >
                <AppImage
                  src={banner.image}
                  alt=""
                  fill
                  sizes="220px"
                  frameClassName="absolute inset-0"
                  className="transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-burgundy-deep/85 via-burgundy-deep/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="font-display text-base leading-tight">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-white/80">{banner.subtitle}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
