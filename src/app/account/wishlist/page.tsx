"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { discountPercent, formatNaira } from "@/lib/utils";
import { useToggleWishlist, useWishlist } from "@/lib/wishlist";
import { useCartStore } from "@/store/cart";

export default function SavedItemsPage() {
  const { data, isLoading } = useWishlist();
  const toggle = useToggleWishlist();
  const addItem = useCartStore((s) => s.addItem);
  const rows = data ?? [];

  return (
    <AccountCard title={`Saved Items${rows.length ? ` (${rows.length})` : ""}`}>
      {isLoading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Heart} title="You haven't saved an item yet!" text="Found something you like? Tap the heart shaped icon next to the item to add it to your saved items." action={{ label: "Continue shopping", href: "/shop" }} />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ id, product, available }) => {
            const off = discountPercent(product.price, product.compare_at_price);
            const hasOptions = (product.variants?.length ?? 0) > 0;
            return (
              <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link href={`/product/${product.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-surface">
                  <AppImage src={product.images?.[0]?.url} alt="" fill sizes="80px" frameClassName="absolute inset-0" />
                </Link>
                <div className="min-w-0 flex-1 text-[13px]">
                  <Link href={`/product/${product.slug}`} className="line-clamp-2 text-[14px] hover:text-burgundy">
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-[15px] font-bold">{formatNaira(product.price)}</p>
                  {off && (
                    <p className="text-muted">
                      <span className="line-through">{formatNaira(product.compare_at_price!)}</span> <span className="font-semibold text-crimson">-{off}%</span>
                    </p>
                  )}
                  {available === false && <p className="text-crimson">No longer available</p>}
                  {available !== false && product.stock <= 0 && <p className="text-crimson">Out of stock</p>}
                </div>
                <div className="flex items-center gap-2">
                  {available !== false && product.stock > 0 && (
                    hasOptions ? (
                      <Link href={`/product/${product.slug}`} className="inline-flex items-center gap-1.5 rounded-md bg-crimson px-3 py-2 text-[12px] font-bold text-white uppercase hover:bg-crimson-hover">
                        Choose options
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (addItem(product, 1) > 0) toast.success("Added to cart", { label: "View cart", href: "/cart" });
                          else toast.error("No more stock available");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-crimson px-3 py-2 text-[12px] font-bold text-white uppercase hover:bg-crimson-hover"
                      >
                        <ShoppingCart size={14} /> Buy now
                      </button>
                    )
                  )}
                  <button type="button" onClick={() => toggle(product)} className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-[12px] font-bold text-crimson uppercase hover:bg-crimson/10">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountCard>
  );
}
