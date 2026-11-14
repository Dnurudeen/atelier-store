import Link from "next/link";
import { CategoryTiles } from "@/components/home/category-tiles";
import { HeroBanner } from "@/components/home/hero-banner";
import { ProductRail } from "@/components/home/product-rail";
import { PromoTiles } from "@/components/home/promo-tiles";
import { RecentlyViewedRail } from "@/components/home/recently-viewed-rail";
import { getBanners, getCategories, getHomeFeed } from "@/lib/catalog";

export const revalidate = 60;

export default async function HomePage() {
  const [banners, feed, categories] = await Promise.all([getBanners(), getHomeFeed(), getCategories()]);
  const flashIds = new Set(feed.flash.map((product) => product.id));
  const flash = [...feed.flash];
  for (const deal of feed.deals) {
    if (flash.length >= 12) break;
    if (!flashIds.has(deal.id)) {
      flash.push(deal);
      flashIds.add(deal.id);
    }
  }
  const nothing =
    !feed.deals.length && !feed.top_sellers.length && !feed.new_arrivals.length && !feed.categories.length;

  return (
    <div className="bg-[var(--page-bg)] pb-10">
      <HeroBanner banners={banners} />
      <PromoTiles banners={banners} />

      {nothing && (
        <section className="pt-3">
          <div className="container-atelier">
            <div className="rounded-md bg-white px-5 py-10 text-center">
              <h2 className="font-display text-2xl text-burgundy">
                {feed.error ? "We couldn't load products right now" : "New pieces are on their way"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {feed.error ? "Please refresh in a moment." : "Our makers are listing new work. Check back soon."}
              </p>
            </div>
          </div>
        </section>
      )}

      <ProductRail
        title="Flash Sales"
        subtitle={flash.length && !feed.flash_ends_at ? "Limited-time prices" : undefined}
        href="/shop?on_sale=1&sort=discount"
        products={flash}
        tone="crimson"
        endsAt={flash.length ? feed.flash_ends_at : null}
        showStockBar
      />

      <CategoryTiles categories={categories} />

      <ProductRail title="Top Sellers" subtitle="What shoppers love right now" href="/shop?sort=popular" products={feed.top_sellers} tone="dark" />

      <ProductRail title="Sponsored" subtitle="Featured by our makers" href="/shop" products={feed.sponsored} tone="burgundy" />

      <ProductRail title="New Arrivals" href="/shop?sort=newest" products={feed.new_arrivals} tone="light" />

      <RecentlyViewedRail />

      {feed.categories.map((row) => (
        <ProductRail key={row.category.id} title={row.category.name} href={`/category/${row.category.slug}`} products={row.products} tone="light" />
      ))}

      {feed.stores.slice(0, 4).map((row) => (
        <ProductRail
          key={row.store.id}
          title={row.store.name}
          subtitle="Official Store"
          href={`/makers/${row.store.slug}`}
          products={row.products}
          tone="dark"
        />
      ))}

      <section className="pt-3">
        <div className="container-atelier">
          <div className="overflow-hidden rounded-md bg-burgundy px-5 py-6 text-white md:flex md:items-center md:justify-between md:px-8 md:py-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl md:text-3xl">Sell your craft on Atelier</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/80 md:text-sm">
                List your products, manage orders and get paid weekly. Reach buyers across all 36 states.
              </p>
            </div>
            <Link
              href="/become-a-vendor"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-burgundy transition hover:bg-surface-warm md:mt-0"
            >
              Start selling
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
