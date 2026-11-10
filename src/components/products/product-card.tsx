"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { Heart, Star } from "lucide-react";
import type { Product } from "@/lib/api";
import { api } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { discountPercent, formatNaira, formatRating } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

export function ProductCard({
  product,
  index = 0,
  compact = false,
}: {
  product: Product;
  index?: number;
  compact?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const image = product.images?.[0]?.url;
  const off = discountPercent(product.price, product.compare_at_price);
  const rating = product.reviews_count ? formatRating(product.rating) : null;
  const [saved, setSaved] = useState(false);
  const stock = product.stock ?? 0;

  async function toggleWishlist(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const res = await api<{ data: { wishlisted: boolean } }>("/account/wishlist", {
      method: "POST",
      body: { product_id: product.id },
    });
    setSaved(res.data.wishlisted);
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border/80 bg-white transition hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        <AppImage
          src={image}
          alt={product.name}
          fill
          sizes={compact ? "180px" : "(max-width:768px) 48vw, 16vw"}
          className="transition duration-500 group-hover:scale-105"
          frameClassName="absolute inset-0"
        />
        {off && (
          <span className="absolute top-1.5 right-1.5 z-10 rounded bg-crimson px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{off}%
          </span>
        )}
        {product.is_sponsored && (
          <span className="absolute bottom-1.5 left-1.5 z-10 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-burgundy">
            Sponsored
          </span>
        )}
        <button
          type="button"
          onClick={(event) => void toggleWishlist(event)}
          className="absolute top-1.5 left-1.5 z-10 rounded-full bg-white/90 p-1.5 text-foreground/65 shadow-sm backdrop-blur transition hover:text-crimson"
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={13} className={saved ? "fill-crimson text-crimson" : undefined} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-0.5 px-2 pt-2 pb-2.5">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[2.4em] text-[12px] leading-snug text-foreground/90 md:text-[13px]"
        >
          {product.name}
        </Link>
        {rating && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-foreground/75">
            <Star size={11} className="fill-crimson text-crimson" />
            {rating}
            <span className="text-muted">({product.reviews_count})</span>
          </span>
        )}
        <div className="mt-auto pt-1">
          <p className="text-[14px] font-bold text-burgundy">{formatNaira(product.price)}</p>
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
            <p className="text-[11px] text-muted line-through">{formatNaira(product.compare_at_price)}</p>
          )}
          <p className="mt-0.5 text-[10px] text-muted">
            {stock <= 0 ? "Out of stock" : stock <= 5 ? `Items left: ${stock}` : `${stock} in stock`}
          </p>
        </div>
      </div>
      <span className="sr-only">{index}</span>
    </article>
  );
}
