"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Product } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark" | "crimson" | "burgundy";

const TONES: Record<Tone, { wrap: string; title: string; link: string; sub: string }> = {
  light: { wrap: "bg-transparent", title: "text-foreground", link: "text-burgundy hover:underline", sub: "text-muted" },
  dark: { wrap: "bg-[#3b3b3b]", title: "text-white", link: "bg-white text-foreground hover:bg-surface", sub: "text-white/75" },
  crimson: { wrap: "bg-crimson", title: "text-white", link: "bg-white text-crimson hover:bg-surface", sub: "text-white/85" },
  burgundy: { wrap: "bg-burgundy", title: "text-white", link: "bg-white text-burgundy hover:bg-surface", sub: "text-white/80" },
};

/**
 * Jumia rail: a rounded coloured container with a bold title, optional countdown,
 * a "See All →" pill and a horizontally scrolling row of product cards.
 */
export function ProductRail({
  title,
  subtitle,
  href,
  products,
  tone = "light",
  endsAt,
  showStockBar,
  /** @deprecated */
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  tone?: Tone | "default" | "deal" | "sponsored";
  endsAt?: string | null;
  showStockBar?: boolean;
  eyebrow?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, products.length]);

  function scroll(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.85, 220), behavior: "smooth" });
  }

  if (products.length === 0) return null;
  const key: Tone = tone === "default" ? "light" : tone === "deal" ? "crimson" : tone === "sponsored" ? "burgundy" : tone;
  const t = TONES[key];
  const sub = subtitle ?? eyebrow;

  return (
    <section className="pt-3">
      <div className="container-atelier">
        <div className={cn("overflow-hidden rounded-md", t.wrap)}>
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 md:px-5 md:pt-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className={cn("truncate font-sans text-lg font-bold tracking-normal md:text-[22px]", t.title)}>{title}</h2>
                {endsAt && (
                  <span className={cn("inline-flex items-center gap-1.5 text-[13px] md:text-sm", key === "light" ? "text-crimson" : "text-white")}>
                    <Clock size={15} />
                    <Countdown endsAt={endsAt} label="" />
                  </span>
                )}
              </div>
              {sub && !endsAt && <p className={cn("text-[12px] md:text-[13px]", t.sub)}>{sub}</p>}
            </div>
            {href && (
              <Link
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold",
                  key === "light" ? t.link : cn("rounded-full px-3 py-1.5", t.link)
                )}
              >
                See All <ChevronRight size={15} />
              </Link>
            )}
          </div>
          <div className="relative">
            <div ref={scroller} className="product-rail scroll-px-4 px-4 pb-4 md:scroll-px-5 md:px-5 md:pb-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} compact plain={key === "light"} showStockBar={showStockBar} />
              ))}
            </div>
            {canPrev && (
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Previous products"
                className="absolute top-[30%] left-2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground/75 shadow-md transition hover:text-burgundy md:left-3 md:inline-flex"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {canNext && (
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Next products"
                className="absolute top-[30%] right-2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground/75 shadow-md transition hover:text-burgundy md:right-3 md:inline-flex"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
