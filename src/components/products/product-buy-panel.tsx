"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { api, type Product, type ProductVariant } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { media } from "@/lib/media";
import { discountPercent, formatNaira, formatRating, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShareLinks } from "@/components/products/share-links";
import { SellerScore } from "@/components/products/seller-score";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";

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

function optionGroups(variants: ProductVariant[]) {
  const keys = new Set<string>();
  variants.forEach((variant) => {
    Object.keys(variant.attributes || {}).forEach((key) => keys.add(key));
  });
  return [...keys].map((key) => ({
    key,
    values: [...new Set(variants.map((variant) => variant.attributes?.[key]).filter(Boolean))] as string[],
  }));
}

export function ProductBuyPanel({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const variants = product.variants || [];
  const groups = useMemo(() => optionGroups(variants), [variants]);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = variants[0]?.attributes || {};
    return { ...first };
  });
  const [plainVariant, setPlainVariant] = useState<ProductVariant | null>(variants[0] ?? null);

  const variant = groups.length
    ? variants.find((item) => groups.every((group) => item.attributes?.[group.key] === selected[group.key])) || null
    : plainVariant;

  const price = variant?.price ?? product.price;
  const inStock = (variant?.stock ?? product.stock) > 0;
  const off = discountPercent(price, product.compare_at_price);
  const rating = product.reviews_count ? formatRating(product.rating) : null;
  const specs = Object.entries(product.specs || {}).filter(([, value]) => value);

  async function toggleWishlist() {
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
          {product.compare_at_price && Number(product.compare_at_price) > Number(price) && (
            <p className="text-sm text-muted line-through">{formatNaira(product.compare_at_price)}</p>
          )}
          {off && <span className="rounded-full bg-crimson px-2 py-0.5 text-xs font-semibold text-white">-{off}%</span>}
          {rating && (
            <span className="inline-flex items-center gap-1 text-sm text-foreground/80">
              <Star size={14} className="fill-crimson text-crimson" />
              {rating}
              <span className="text-muted">({product.reviews_count})</span>
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">{inStock ? `${variant?.stock ?? product.stock} in stock` : "Out of stock"}</p>
      </div>

      {product.description && <p className="text-sm leading-relaxed text-muted">{product.description}</p>}

      {groups.length > 0
        ? groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{group.key}</p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((current) => ({ ...current, [group.key]: value }))}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      selected[group.key] === value
                        ? "border-burgundy bg-burgundy text-white"
                        : "border-border hover:border-burgundy"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))
        : variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Option</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlainVariant(item)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      plainVariant?.id === item.id
                        ? "border-burgundy bg-burgundy text-white"
                        : "border-border hover:border-burgundy"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

      {specs.length > 0 && (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {specs.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-border px-3 py-2">
              <dt className="text-[11px] tracking-wide text-muted uppercase">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="hidden flex-wrap items-center gap-3 md:flex">
        <div className="inline-flex items-center rounded-full border border-border bg-white">
          <button type="button" className="p-2.5" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
            <Minus size={16} />
          </button>
          <span className="min-w-8 text-center text-sm font-medium">{quantity}</span>
          <button type="button" className="p-2.5" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
            <Plus size={16} />
          </button>
        </div>
        <Button size="lg" className="min-w-[200px] flex-1 sm:flex-none" disabled={!inStock} onClick={() => addItem(product, quantity, variant)}>
          <ShoppingBag size={18} />
          {inStock ? "Add to cart" : "Out of stock"}
        </Button>
        <button
          type="button"
          onClick={() => void toggleWishlist()}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:border-burgundy hover:text-burgundy"
        >
          <Heart size={16} className={saved ? "fill-crimson text-crimson" : undefined} />
          Wishlist
        </button>
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md md:hidden"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button type="button" onClick={() => void toggleWishlist()} className="rounded-full border border-border p-2.5" aria-label="Wishlist">
            <Heart size={16} className={saved ? "fill-crimson text-crimson" : undefined} />
          </button>
          <Button size="md" className="h-11 flex-1" disabled={!inStock} onClick={() => addItem(product, quantity, variant)}>
            <ShoppingBag size={16} />
            {inStock ? `Add · ${formatNaira(price)}` : "Out of stock"}
          </Button>
        </div>
      </div>

      <ShareLinks path={`/product/${product.slug}`} title={product.name} />

      {product.store && <VendorCard store={product.store} />}
      <ReviewList product={product} />
    </div>
  );
}

function ReviewList({ product }: { product: Product }) {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState(product.reviews || []);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      const res = await api<{ data: { id: number; rating: number; comment?: string | null; user?: { id: number; name: string } } }>(
        "/account/reviews",
        { method: "POST", body: { product_id: product.id, rating, comment } }
      );
      setReviews((current) => {
        const next = current.filter((review) => review.user?.id !== user.id);
        return [{ ...res.data, user: res.data.user || { id: user.id, name: user.name } }, ...next];
      });
      setComment("");
      setMessage("Review saved. Other buyers can see it on this piece.");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to save review");
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="font-display text-2xl">Reviews</h2>
      {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet. Buyers can rate this piece after it is delivered.</p>}
      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl border border-border bg-white p-4">
            <p className="text-sm font-medium">{review.user?.name || "Buyer"}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-burgundy">
              <Star size={14} className="fill-crimson text-crimson" />
              {review.rating}
            </p>
            {review.comment && <p className="mt-2 text-sm leading-relaxed text-muted">{review.comment}</p>}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-surface/60 p-4">
        <p className="text-sm font-medium">Rate this piece</p>
        <p className="text-xs text-muted">Only buyers with a delivered order can leave a review.</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={cn(
                "h-9 w-9 rounded-full border text-sm",
                rating === value ? "border-burgundy bg-burgundy text-white" : "border-border"
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <Textarea label="Comment" value={comment} onChange={(event) => setComment(event.target.value)} />
        {error && <p className="text-sm text-crimson">{error}</p>}
        {message && <p className="text-sm text-burgundy">{message}</p>}
        <Button type="submit" size="sm">
          Submit review
        </Button>
      </form>
    </section>
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
          {formatRating(store.rating) && (
            <p className="text-sm text-foreground/80">{formatRating(store.rating)} store rating</p>
          )}
        </div>
        <Link
          href={`/makers/${store.slug}`}
          className="shrink-0 text-sm font-medium text-burgundy hover:underline"
        >
          Visit store
        </Link>
      </div>
      {store.bio && <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-3">{store.bio}</p>}
      <div className="mt-4">
        <SellerScore score={store.seller_score} />
      </div>
      <Link href={`/makers/${store.slug}`} className="mt-3 inline-flex text-sm font-medium text-burgundy hover:underline">
        All products from this maker
      </Link>
    </div>
  );
}
