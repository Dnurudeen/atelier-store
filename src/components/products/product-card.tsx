"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { formatNaira } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const image = product.images?.[0]?.url;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.24) }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white md:rounded-2xl"
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-surface">
        <AppImage
          src={image}
          alt={product.name}
          fill
          sizes="(max-width:768px) 48vw, 25vw"
          className="transition duration-700 group-hover:scale-105"
          frameClassName="absolute inset-0"
        />
        {product.compare_at_price && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-crimson px-2 py-0.5 text-[10px] font-semibold text-white md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[11px]">
            Sale
          </span>
        )}
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-foreground/70 shadow-sm backdrop-blur transition hover:text-crimson md:right-3 md:top-3 md:p-2 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Wishlist"
        >
          <Heart size={14} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-2.5 md:gap-2 md:p-4">
        <Link
          href={`/makers/${product.store?.slug}`}
          className="truncate text-[10px] font-medium tracking-wider text-muted uppercase md:text-[11px]"
        >
          {product.store?.name}
        </Link>
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 font-display text-[0.95rem] leading-snug text-foreground md:text-lg"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5 md:gap-3 md:pt-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-burgundy md:text-sm">
              {formatNaira(product.price)}
            </p>
            {product.compare_at_price && (
              <p className="text-[11px] text-muted line-through md:text-xs">
                {formatNaira(product.compare_at_price)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addItem(product)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-burgundy text-white transition hover:bg-burgundy-deep md:h-9 md:w-9"
            aria-label="Add to cart"
          >
            <ShoppingBag size={14} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
