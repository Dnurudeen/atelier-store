"use client";

import { ProductRail } from "@/components/home/product-rail";
import { useRecentlyViewed } from "@/lib/recently-viewed";

export function RecentlyViewedRail({ excludeId, tone = "dark" }: { excludeId?: number; tone?: "dark" | "light" }) {
  const items = useRecentlyViewed().filter((p) => p.id !== excludeId);
  if (items.length === 0) return null;
  return <ProductRail title="Recently viewed" href="/account/recently-viewed" products={items} tone={tone} />;
}
