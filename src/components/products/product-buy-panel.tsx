"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { formatNaira, formatRating, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images?.length
    ? product.images
    : [{ id: 0, url: media.product(1) }];
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface md:rounded-2xl">
        <AppImage
          key={current.url}
          src={current.url}
          alt={product.name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          frameClassName="absolute inset-0"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                index === active ? "border-burgundy" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <AppImage src={img.url} alt="" fill sizes="64px" frameClassName="absolute inset-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductBuyPanel({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState<ProductVariant | null>(product.variants?.[0] ?? null);

  const price = variant?.price ?? product.price;
  const inStock = (variant?.stock ?? product.stock) > 0;

  return (
    <div className="space-y-6">
      <div>
        {product.category && (
          <Link
            href={`/shop?category=${product.category.slug}`}
            className="text-xs font-semibold tracking-wider text-muted uppercase hover:text-burgundy"
          >
            {product.category.name}
          </Link>
        )}
        <h1 className="mt-1.5 font-display text-2xl leading-tight md:mt-2 md:text-4xl">{product.name}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-3 md:mt-3 md:gap-4">
          <p className="text-xl font-semibold text-burgundy md:text-2xl">{formatNaira(price)}</p>
          {product.compare_at_price && (
            <p className="text-sm text-muted line-through">{formatNaira(product.compare_at_price)}</p>
          )}
          {formatRating(product.rating) && (
            <span className="inline-flex items-center gap-1 text-sm text-foreground/80">
              <Star size={14} className="fill-crimson text-crimson" />
              {formatRating(product.rating)}
              {product.reviews_count != null && (
                <span className="text-muted">({product.reviews_count} reviews)</span>
              )}
            </span>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-sm leading-relaxed text-muted">{product.description}</p>
      )}

      {product.variants && product.variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Variant</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  variant?.id === v.id
                    ? "border-burgundy bg-burgundy text-white"
                    : "border-border hover:border-burgundy"
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="hidden flex-wrap items-center gap-4 md:flex">
        <div className="inline-flex items-center rounded-full border border-border bg-white">
          <button
            type="button"
            className="p-2.5"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-8 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            className="p-2.5"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
        <Button
          size="lg"
          className="min-w-[200px] flex-1 sm:flex-none"
          disabled={!inStock}
          onClick={() => addItem(product, quantity, variant)}
        >
          <ShoppingBag size={18} />
          {inStock ? "Add to cart" : "Out of stock"}
        </Button>
      </div>

      {/* Mobile sticky purchase bar — sits above the app tab bar */}
      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md md:hidden"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-border bg-white">
            <button
              type="button"
              className="p-2"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="min-w-7 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              className="p-2"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
          <Button
            size="md"
            className="h-11 flex-1"
            disabled={!inStock}
            onClick={() => addItem(product, quantity, variant)}
          >
            <ShoppingBag size={16} />
            {inStock ? `Add · ${formatNaira(price)}` : "Out of stock"}
          </Button>
        </div>
      </div>

      {!inStock && (
        <p className="text-sm text-crimson">This piece is currently unavailable. Check back soon.</p>
      )}

      {product.store && <VendorCard store={product.store} />}
    </div>
  );
}

export function VendorCard({ store }: { store: NonNullable<Product["store"]> }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Made by</p>
      <div className="mt-3 flex items-center gap-4">
        {store.logo && (
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border bg-white">
            <AppImage
              src={store.logo}
              alt={store.name}
              fill
              className="object-cover"
              sizes="56px"
              frameClassName="absolute inset-0"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/makers/${store.slug}`} className="font-display text-lg hover:text-burgundy">
            {store.name}
          </Link>
          {store.location && <p className="text-sm text-muted">{store.location}</p>}
        </div>
        <Link
          href={`/makers/${store.slug}`}
          className="shrink-0 text-sm font-medium text-burgundy hover:underline"
        >
          Visit store
        </Link>
      </div>
      {store.bio && <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-3">{store.bio}</p>}
    </div>
  );
}
