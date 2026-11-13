import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark" | "crimson" | "burgundy";

const TONES: Record<Tone, { wrap: string; title: string; link: string; sub: string }> = {
  light: { wrap: "bg-white", title: "text-foreground", link: "text-burgundy hover:underline", sub: "text-muted" },
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
  if (products.length === 0) return null;
  const key: Tone = tone === "default" ? "light" : tone === "deal" ? "crimson" : tone === "sponsored" ? "burgundy" : tone;
  const t = TONES[key];
  const sub = subtitle ?? eyebrow;

  return (
    <section className="pt-3">
      <div className="container-atelier">
        <div className={cn("overflow-hidden rounded-md", t.wrap)}>
          <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2 md:px-4 md:pt-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className={cn("truncate font-sans text-lg font-bold tracking-normal md:text-[22px]", t.title)}>{title}</h2>
                {endsAt && (
                  <Countdown
                    endsAt={endsAt}
                    className={cn("rounded px-2 py-0.5 text-[12px] md:text-[13px]", key === "light" ? "bg-crimson/10 text-crimson" : "bg-white/15 text-white")}
                  />
                )}
              </div>
              {sub && <p className={cn("text-[12px] md:text-[13px]", t.sub)}>{sub}</p>}
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
          <div className="product-rail px-2 pb-3 md:px-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} compact showStockBar={showStockBar} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
