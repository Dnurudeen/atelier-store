"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroBanner({ banners }: { banners: Banner[] }) {
  const activeBanners = banners.filter((b) => b.is_active);
  const [selected, setSelected] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6500, stopOnInteraction: false }),
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

  return (
    <section className="relative overflow-hidden bg-[#3d060d]">
      {/* Desktop keeps the original inset carousel; mobile stays edge-to-edge. */}
      <div className="container-atelier relative py-0 md:py-8">
        <div className="relative -mx-4 aspect-[5/6] max-h-[72vh] min-h-[280px] overflow-hidden md:mx-0 md:aspect-[16/7] md:max-h-[480px] md:min-h-[440px] md:rounded-3xl">
          {activeBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1500ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                index === selected ? "opacity-100" : "opacity-0"
              )}
            >
              <AppImage
                src={banner.image}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                frameClassName="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 md:bg-gradient-to-r md:from-black/55 md:via-black/20 md:to-transparent" />
            </div>
          ))}

          <div className="absolute inset-0 z-10 flex items-end p-4 pb-8 md:p-12">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl text-white"
            >
              <p className="mb-1.5 text-[10px] font-medium tracking-[0.2em] text-white/65 uppercase md:mb-2 md:text-xs md:tracking-[0.22em]">
                Handcrafted in Nigeria
              </p>
              <h1 className="font-display text-[1.65rem] leading-[1.15] text-balance md:text-5xl lg:text-[3.35rem]">
                {current.title}
              </h1>
              {current.subtitle && (
                <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-white/82 md:mt-4 md:text-base">
                  {current.subtitle}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2.5 md:mt-8 md:gap-3">
                {current.cta_url && current.cta_label && (
                  <Button
                    variant="white"
                    size="md"
                    className="h-10 px-5 text-sm md:h-12 md:px-7 md:text-base"
                    onClick={() => {
                      window.location.href = current.cta_url!;
                    }}
                  >
                    {current.cta_label}
                  </Button>
                )}
                <Link
                  href="/makers"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/35 px-5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 md:h-12 md:px-7"
                >
                  Meet makers
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-5 right-5 z-20 hidden items-center gap-2 md:flex md:bottom-8 md:right-8">
            <button
              type="button"
              className="rounded-full border border-white/30 bg-black/25 p-2.5 text-white backdrop-blur transition hover:bg-white/15"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="rounded-full border border-white/30 bg-black/25 p-2.5 text-white backdrop-blur transition hover:bg-white/15"
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
            </button>
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

        <div className="mt-3 flex justify-center gap-1.5 md:absolute md:bottom-6 md:left-1/2 md:mt-0 md:-translate-x-1/2 md:gap-2">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-500 md:h-1.5",
                i === selected ? "w-6 bg-crimson md:w-8" : "w-1 bg-white/45 hover:bg-white/75 md:w-1.5"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
