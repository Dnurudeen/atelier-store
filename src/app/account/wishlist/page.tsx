"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { api, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type WishlistRow = {
  id: number;
  product: Product;
};

export default function AccountWishlistPage() {
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await api<{ data: WishlistRow[] }>("/account/wishlist");
      setItems(res.data || []);
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to load wishlist");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(productId: number) {
    await api("/account/wishlist", { method: "POST", body: { product_id: productId } });
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Wishlist</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="relative aspect-[4/5]">
              <AppImage
                src={item.product.images?.[0]?.url}
                alt={item.product.name}
                fill
                sizes="33vw"
                frameClassName="absolute inset-0"
              />
            </div>
            <div className="space-y-2 p-4">
              <Link href={`/product/${item.product.slug}`} className="font-medium hover:text-burgundy">
                {item.product.name}
              </Link>
              <p className="text-sm font-semibold text-burgundy">{formatNaira(item.product.price)}</p>
              <Button variant="outline" size="sm" onClick={() => void remove(item.product.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && !error && <p className="text-sm text-muted">No saved pieces yet.</p>}
    </div>
  );
}
