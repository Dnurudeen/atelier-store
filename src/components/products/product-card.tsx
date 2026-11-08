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
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white"
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-surface">
        <AppImage
          src={image}
          alt={product.name}
          fill
          sizes="(max-width:768px) 50vw, 25vw"
          className="transition duration-700 group-hover:scale-105"
          frameClassName="absolute inset-0"
        />
        {product.compare_at_price && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-crimson px-2.5 py-1 text-[11px] font-semibold text-white">
            Sale
          </span>
        )}
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-foreground/70 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:text-crimson"
          aria-label="Wishlist"
        >
          <Heart size={16} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/makers/${product.store?.slug}`}
          className="text-[11px] font-medium tracking-wider text-muted uppercase"
        >
          {product.store?.name}
        </Link>
        <Link href={`/product/${product.slug}`} className="font-display text-lg leading-snug text-foreground">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-sm font-semibold text-burgundy">{formatNaira(product.price)}</p>
            {product.compare_at_price && (
              <p className="text-xs text-muted line-through">
                {formatNaira(product.compare_at_price)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addItem(product)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-burgundy text-white transition hover:bg-burgundy-deep"
            aria-label="Add to cart"
          >
            <ShoppingBag size={15} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
