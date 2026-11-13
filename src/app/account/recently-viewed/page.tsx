"use client";

import { Clock } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { clearRecentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";

export default function RecentlyViewedPage() {
  const items = useRecentlyViewed();

  return (
    <AccountCard
      title="Recently Viewed"
      action={
        items.length > 0 && (
          <button type="button" onClick={clearRecentlyViewed} className="text-[13px] font-semibold text-crimson uppercase">
            Clear all
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={Clock} title="No recently viewed items" text="Products you look at will appear here so you can find them again." action={{ label: "Continue shopping", href: "/shop" }} />
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border/60 p-px sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </AccountCard>
  );
}
