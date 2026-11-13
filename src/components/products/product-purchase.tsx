"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Heart, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { RatingStars } from "@/components/ui/rating-stars";
import { toast } from "@/components/ui/toast";
import { ShareLinks } from "@/components/products/share-links";
import { rememberProduct } from "@/lib/recently-viewed";
import { cn, discountPercent, formatNaira } from "@/lib/utils";
import { isOptionAvailable, matchVariant, optionGroups } from "@/lib/variants";
import { useIsSaved, useToggleWishlist } from "@/lib/wishlist";
import { maxQuantity, useCartStore } from "@/store/cart";

/** Variants without attributes (e.g. named options) become a single "Option" group. */
function normalise(variants: ProductVariant[]): ProductVariant[] {
  return variants.map((v) => (Object.keys(v.attributes ?? {}).length ? v : { ...v, attributes: { option: v.name } }));
}

export function ProductPurchase({ product, onVariantChange }: { product: Product; onVariantChange?: (v: ProductVariant | null) => void }) {
  const router = useRouter();
  const variants = useMemo(() => normalise(product.variants ?? []), [product.variants]);
  const groups = useMemo(() => optionGroups(variants), [variants]);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    // Preselect the first in-stock variant so the price/stock shown are real.
    const first = variants.find((v) => v.stock > 0) ?? variants[0];
    return { ...(first?.attributes ?? {}) };
  });
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const saved = useIsSaved(product.id);
  const toggleWishlist = useToggleWishlist();

  const variant = matchVariant(variants, groups, selected);
  const needsChoice = groups.length > 0 && !variant;
  const price = variant?.price && Number(variant.price) > 0 ? variant.price : product.price;
  const stock = variant ? variant.stock : product.stock;
  const cap = needsChoice ? 0 : maxQuantity(product, variant);
  const off = discountPercent(price, product.compare_at_price);
  // The API hides compare_at_price once a timed sale has ended, so a discount with an end date is a live sale.
  const saleActive = Boolean(off && product.sale_ends_at);

  useEffect(() => {
    rememberProduct(product);
  }, [product]);

  useEffect(() => {
    onVariantChange?.(variant);
  }, [variant, onVariantChange]);

  function add(buyNow = false) {
    if (needsChoice) {
      setShowErrors(true);
      toast.error(`Please select ${groups.filter((g) => !selected[g.key]).map((g) => g.label.toLowerCase()).join(" and ")}`);
      return;
    }
    const realVariant = variant ? (product.variants ?? []).find((v) => v.id === variant.id) ?? variant : null;
    const added = addItem(product, quantity, realVariant);
    if (added <= 0) {
      toast.error(stock <= 0 ? "This item is out of stock" : "You already have the maximum available in your cart");
      return;
    }
    if (buyNow) router.push("/checkout");
    else toast.success(added < quantity ? `Added ${added} (that's all we have)` : "Product added successfully", { label: "View cart", href: "/cart" });
  }

  return (
    <div>
      {product.brand && (
        <p className="text-[12px] text-muted">
          Brand:{" "}
          <Link href={`/shop?brand=${product.brand.slug}`} className="font-medium text-burgundy hover:underline">
            {product.brand.name}
          </Link>{" "}
          |{" "}
          <Link href={`/shop?brand=${product.brand.slug}`} className="text-burgundy hover:underline">
            Similar products from {product.brand.name}
          </Link>
        </p>
      )}

      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="font-sans text-lg leading-snug font-medium tracking-normal md:text-xl">{product.name}</h1>
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved items" : "Save for later"}
          className="shrink-0 rounded-full p-2 text-crimson hover:bg-crimson/10"
        >
          <Heart size={22} className={saved ? "fill-crimson" : undefined} />
        </button>
      </div>

      {Number(product.reviews_count) > 0 ? (
        <a href="#reviews" className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-burgundy hover:underline">
          <RatingStars value={product.rating} size={14} />({product.reviews_count} verified rating{product.reviews_count === 1 ? "" : "s"})
        </a>
      ) : (
        <p className="mt-1 text-[12px] text-muted">No ratings yet</p>
      )}

      {saleActive && (
        <div className="mt-3 flex items-center justify-between rounded-t-md bg-crimson px-3 py-1.5 text-[13px] text-white">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Zap size={14} className="fill-white" /> Flash Sale
          </span>
          <Countdown endsAt={product.sale_ends_at!} label="Ends in" />
        </div>
      )}

      <div className={cn("border-b border-border pb-3", saleActive ? "rounded-b-md border border-t-0 px-3 pt-2" : "mt-3 border-t pt-3")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-2xl font-bold">{formatNaira(price)}</p>
          {off && (
            <>
              <p className="text-[15px] text-muted line-through">{formatNaira(product.compare_at_price!)}</p>
              <span className="rounded-sm bg-[#fde8e9] px-1.5 py-0.5 text-[13px] font-bold text-crimson">-{off}%</span>
            </>
          )}
        </div>
        <p className={cn("mt-1 text-[12px]", stock <= 0 ? "text-crimson" : stock <= 5 ? "font-semibold text-crimson" : "text-muted")}>
          {needsChoice ? "Select options to see availability" : stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left — order soon` : "In stock"}
        </p>
        {product.store?.shipping_fee !== undefined && (
          <p className="mt-0.5 text-[12px] text-muted">
            + shipping from {formatNaira(product.store.shipping_fee ?? 0)} to your area
          </p>
        )}
      </div>

      {groups.map((group) => (
        <fieldset key={group.key} className="mt-3">
          <legend className={cn("mb-1.5 text-[12px] font-semibold tracking-wide uppercase", showErrors && !selected[group.key] && "text-crimson")}>
            {group.label}: <span className="font-normal normal-case text-muted">{selected[group.key] || "choose one"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const available = isOptionAvailable(variants, selected, group.key, value);
              const active = selected[group.key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected((s) => ({ ...s, [group.key]: value }))}
                  aria-pressed={active}
                  className={cn(
                    "min-w-11 rounded-md border px-3 py-1.5 text-[13px] transition",
                    active ? "border-crimson bg-crimson/5 font-semibold text-crimson" : "border-border hover:border-burgundy",
                    !available && "text-muted line-through decoration-muted/60"
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[12px] font-semibold tracking-wide uppercase">Quantity</span>
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="flex h-9 w-9 items-center justify-center text-crimson disabled:text-muted"
            aria-label="Decrease quantity"
          >
            <Minus size={15} />
          </button>
          <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(Math.max(1, cap - inCart), q + 1))}
            disabled={quantity >= Math.max(1, cap - inCart)}
            className="flex h-9 w-9 items-center justify-center text-crimson disabled:text-muted"
            aria-label="Increase quantity"
          >
            <Plus size={15} />
          </button>
        </div>
        {inCart > 0 && <span className="text-[12px] text-muted">{inCart} already in cart</span>}
      </div>

      <div className="mt-4 hidden gap-2 md:flex">
        <Button size="lg" className="flex-1 uppercase" onClick={() => add(false)} disabled={!needsChoice && stock <= 0}>
          <ShoppingCart size={18} /> {stock <= 0 && !needsChoice ? "Out of stock" : "Add to cart"}
        </Button>
        <Button size="lg" variant="outline" className="border-crimson text-crimson uppercase hover:bg-crimson hover:text-white" onClick={() => add(true)} disabled={!needsChoice && stock <= 0}>
          Buy now
        </Button>
      </div>

      <div className="mt-4 rounded-md border border-border p-3">
        <p className="text-[12px] font-bold tracking-wide uppercase">Promotions</p>
        <ul className="mt-1.5 space-y-1 text-[13px] text-burgundy">
          <li className="flex items-start gap-1.5">
            <BadgeCheck size={15} className="mt-0.5 shrink-0" /> Use a voucher at checkout to save more.
          </li>
          <li className="flex items-start gap-1.5">
            <BadgeCheck size={15} className="mt-0.5 shrink-0" /> Pay securely with card, bank transfer or USSD.
          </li>
        </ul>
      </div>

      <div className="mt-4">
        <ShareLinks path={`/product/${product.slug}`} title={product.name} />
      </div>

      {/* Mobile sticky buy bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-white p-2.5 md:hidden">
        <Button variant="outline" className="h-12 w-12 shrink-0 border-crimson p-0 text-crimson" onClick={() => toggleWishlist(product)} aria-label="Save">
          <Heart size={20} className={saved ? "fill-crimson" : undefined} />
        </Button>
        <Button size="lg" className="h-12 flex-1 uppercase" onClick={() => add(false)} disabled={!needsChoice && stock <= 0}>
          <ShoppingCart size={18} /> {stock <= 0 && !needsChoice ? "Out of stock" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
