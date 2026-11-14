import Link from "next/link";
import { BadgePercent, Flame, Gift, Sparkles, Store, Tag, TrendingUp } from "lucide-react";
import type { Banner } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";

const DEFAULT_TILES = [
  { title: "Flash Sales", caption: "Up to 50% off", href: "/shop?on_sale=1&sort=discount", icon: Flame, tone: "from-crimson to-[#b8222a]" },
  { title: "Top Sellers", caption: "Shoppers' picks", href: "/shop?sort=popular", icon: TrendingUp, tone: "from-burgundy to-burgundy-deep" },
  { title: "New Arrivals", caption: "Fresh this week", href: "/shop?sort=newest", icon: Sparkles, tone: "from-[#7a1622] to-burgundy" },
  { title: "Under ₦20k", caption: "Budget finds", href: "/shop?max=20000&sort=price_asc", icon: Tag, tone: "from-crimson to-burgundy" },
  { title: "Big Discounts", caption: "40% off & more", href: "/shop?discount=40", icon: BadgePercent, tone: "from-burgundy-deep to-[#5c0a14]" },
  { title: "Official Stores", caption: "Verified makers", href: "/makers", icon: Store, tone: "from-[#8a1b28] to-crimson" },
  { title: "Gift Ideas", caption: "Handmade gifts", href: "/shop?sort=rating", icon: Gift, tone: "from-burgundy to-crimson" },
];

/** Jumia-style row of square shortcut tiles under the hero. Admin "tile" banners replace the defaults. */
export function PromoTiles({ banners }: { banners: Banner[] }) {
  const custom = banners.filter((b) => b.is_active && b.placement === "tile");

  return (
    <section className="pt-4">
      <div className="container-atelier">
        <div className="rounded-md bg-white px-3 py-3.5 md:px-4 md:py-4">
          <div className="mobile-rail flex md:grid md:grid-cols-7 md:gap-4">
            {custom.length
              ? custom.map((b) => (
                  <Link key={b.id} href={b.cta_url || "/shop"} className="group w-[96px] text-center md:w-auto">
                    <span className="relative block aspect-square overflow-hidden rounded-md bg-surface">
                      <AppImage src={b.image} alt="" fill sizes="140px" frameClassName="absolute inset-0" className="transition group-hover:scale-105" />
                    </span>
                    <span className="mt-2 block truncate text-[12px] font-medium">{b.title}</span>
                  </Link>
                ))
              : DEFAULT_TILES.map(({ title, caption, href, icon: Icon, tone }) => (
                  <Link key={title} href={href} className="group w-[96px] text-center md:w-auto">
                    <span className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md bg-gradient-to-br ${tone} p-2.5 text-white transition group-hover:brightness-110`}>
                      <Icon className="h-7 w-7 md:h-9 md:w-9" strokeWidth={1.6} aria-hidden />
                      <span className="text-[10px] font-medium text-white/85 md:text-[11px]">{caption}</span>
                    </span>
                    <span className="mt-2 block truncate text-[12px] font-medium text-foreground/90">{title}</span>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
