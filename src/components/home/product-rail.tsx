import Link from "next/link";
import type { Product } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { cn } from "@/lib/utils";

export function ProductRail({
  title,
  eyebrow,
  href,
  products,
  tone = "default",
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  products: Product[];
  tone?: "default" | "deal" | "sponsored";
}) {
  if (products.length === 0) return null;

  const headerClass =
    tone === "deal"
      ? "bg-crimson text-white"
      : tone === "sponsored"
        ? "bg-burgundy text-white"
        : "border-b border-border bg-white text-foreground";

  const linkClass =
    tone === "default" ? "text-burgundy hover:underline" : "text-white/90 hover:text-white";

  return (
    <section className="pt-3">
      <div className="container-atelier">
        <div className="overflow-hidden rounded-md border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className={cn("flex items-center justify-between gap-3 px-3 py-2.5 md:px-4", headerClass)}>
            <div className="min-w-0">
              {eyebrow && (
                <p
                  className={cn(
                    "text-[10px] font-semibold tracking-[0.16em] uppercase",
                    tone === "default" ? "text-crimson" : "text-white/75"
                  )}
                >
                  {eyebrow}
                </p>
              )}
              <h2
                className={cn(
                  "truncate text-base font-semibold md:text-lg",
                  tone === "default"
                    ? "font-display text-xl md:text-2xl"
                    : "font-[family-name:var(--font-inter)] tracking-normal"
                )}
              >
                {title}
              </h2>
            </div>
            {href && (
              <Link href={href} className={cn("shrink-0 text-xs font-semibold md:text-sm", linkClass)}>
                See All →
              </Link>
            )}
          </div>
          <div className="product-rail px-2 py-3 md:px-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} compact />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
