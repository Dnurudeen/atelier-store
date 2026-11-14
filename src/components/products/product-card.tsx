"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { RatingStars } from "@/components/ui/rating-stars";
import { toast } from "@/components/ui/toast";
import { cn, discountPercent, formatNaira } from "@/lib/utils";
import { useIsSaved, useToggleWishlist } from "@/lib/wishlist";
import { useCartStore } from "@/store/cart";

export function ProductCard({
  product,
  compact = false,
  showStockBar = false,
  plain = false,
}: {
  product: Product;
  compact?: boolean;
  /** Flash-sale style stock line and price badge. */
  showStockBar?: boolean;
  /** No white card fill, so the page background shows through. */
  plain?: boolean;
  /** @deprecated kept for older call sites */
  index?: number;
}) {
  const router = useRouter();
  const image = product.images?.[0]?.url;
  const off = discountPercent(product.price, product.compare_at_price);
  const hasRating = Number(product.reviews_count) > 0;
  const stock = Number(product.stock ?? 0);
  const saved = useIsSaved(product.id);
  const toggleWishlist = useToggleWishlist();
  const addItem = useCartStore((s) => s.addItem);
  const href = `/product/${product.slug}`;
  const hasOptions = (product.variants?.length ?? 0) > 0 || product.has_variants;

  function onQuickAdd(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (hasOptions) {
      router.push(href);
      return;
    }
    const added = addItem(product, 1);
    if (added > 0) toast.success("Product added to cart", { label: "View cart", href: "/cart" });
    else toast.error(stock <= 0 ? "This item is out of stock" : "You already have the maximum quantity in your cart");
  }

  function onSave(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product);
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-md transition hover:z-10",
        plain
          ? "bg-transparent"
          : "border border-transparent bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-burgundy/35 hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-surface" prefetch={false}>
        <AppImage
          src={image}
          alt={product.name}
          fill
          sizes={compact ? "190px" : "(max-width:768px) 48vw, (max-width:1280px) 25vw, 200px"}
          className="transition duration-500 group-hover:scale-[1.04]"
          frameClassName="absolute inset-0"
        />
        {off && !showStockBar && (
          <span className="absolute top-1.5 right-1.5 z-10 rounded-sm bg-[#fde8e9] px-1.5 py-0.5 text-[11px] font-bold text-crimson">
            -{off}%
          </span>
        )}
        {product.is_sponsored && (
          <span className="absolute bottom-1.5 left-1.5 z-10 rounded-sm bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-muted">
            Sponsored
          </span>
        )}
        {stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 z-10 bg-black/60 py-1 text-center text-[11px] font-semibold text-white">
            Out of stock
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={onSave}
        className="absolute top-1.5 left-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-foreground/60 shadow-sm transition hover:text-crimson"
        aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
        aria-pressed={saved}
      >
        <Heart size={14} className={saved ? "fill-crimson text-crimson" : undefined} />
      </button>

      {showStockBar && stock > 0 && (
        <button
          type="button"
          onClick={onQuickAdd}
          className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-white shadow transition hover:bg-crimson"
          aria-label={hasOptions ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
        >
          <Plus size={16} />
        </button>
      )}

      <div className="flex flex-1 flex-col px-2 pt-2 pb-2.5">
        {showStockBar && (
          <p className="mb-0.5 text-[11px] text-muted">{stock <= 0 ? "Out of stock" : stock <= 8 ? `${stock} items left` : `${stock} items in stock`}</p>
        )}
        <Link href={href} prefetch={false} className="line-clamp-2 min-h-[2.5em] text-[12px] leading-snug text-foreground/90 md:text-[13px]">
          {product.name}
        </Link>

        {hasRating && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
            <RatingStars value={product.rating} size={11} />
            <span>({product.reviews_count})</span>
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-1 pt-1.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground md:text-base">{formatNaira(product.price)}</p>
            {off ? (
              <p className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                <span className="truncate line-through">{formatNaira(product.compare_at_price!)}</span>
                {showStockBar && <span className="shrink-0 rounded-sm bg-crimson px-1 py-px text-[10px] font-bold text-white">-{off}%</span>}
              </p>
            ) : (
              <p className="text-[11px] text-transparent select-none" aria-hidden>
                .
              </p>
            )}
          </div>
          {stock > 0 && !showStockBar && (
            <button
              type="button"
              onClick={onQuickAdd}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-white shadow transition hover:bg-crimson"
              aria-label={hasOptions ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
            >
              <Plus size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md bg-white">
      <div className="skeleton aspect-square" />
      <div className="space-y-1.5 p-2">
        <div className="skeleton h-3 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}
