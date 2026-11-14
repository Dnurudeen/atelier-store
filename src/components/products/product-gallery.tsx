"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : [{ id: 0, url: media.fallback }];
  const [active, setActive] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const onSelect = useCallback(() => {
    if (emblaApi) setActive(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  function go(index: number) {
    setActive(index);
    emblaApi?.scrollTo(index);
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md bg-surface" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((img, index) => (
            <div key={img.id ?? index} className="relative aspect-square min-w-0 flex-[0_0_100%]">
              <AppImage
                src={img.url}
                alt={index === 0 ? product.name : `${product.name}, photo ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 380px"
                frameClassName="absolute inset-0"
                className="object-contain"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white md:hidden">
            {active + 1}/{images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
          {images.map((img, index) => (
            <button
              key={img.id ?? index}
              type="button"
              onClick={() => go(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 bg-surface transition",
                index === active ? "border-crimson" : "border-transparent opacity-75 hover:opacity-100"
              )}
            >
              <AppImage src={img.url} alt="" fill sizes="56px" frameClassName="absolute inset-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
