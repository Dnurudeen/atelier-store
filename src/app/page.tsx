import Link from "next/link";
import { HeroBanner } from "@/components/home/hero-banner";
import { ProductRail } from "@/components/home/product-rail";
import { ValueProps } from "@/components/home/value-props";
import { getBanners, getHomeFeed } from "@/lib/catalog";

export default async function HomePage() {
  const [banners, feed] = await Promise.all([getBanners(), getHomeFeed()]);

  return (
    <div className="bg-[var(--page-bg)] pb-8">
      <HeroBanner banners={banners} />
      <ValueProps />

      <ProductRail
        eyebrow="Limited prices"
        title="Flash Deals"
        href="/shop"
        products={feed.deals}
        tone="deal"
      />
      <ProductRail
        eyebrow="Paid placement"
        title="Sponsored"
        href="/shop"
        products={feed.sponsored}
        tone="sponsored"
      />

      {feed.categories.map((row) => (
        <ProductRail
          key={row.category.id}
          title={row.category.name}
          href={`/shop?category=${row.category.slug}`}
          products={row.products}
        />
      ))}

      {feed.stores.slice(0, 4).map((row) => (
        <ProductRail
          key={row.store.id}
          eyebrow="Official Store"
          title={row.store.name}
          href={`/makers/${row.store.slug}`}
          products={row.products}
          tone="sponsored"
        />
      ))}

      <section className="pt-3">
        <div className="container-atelier">
          <div className="overflow-hidden rounded-md bg-burgundy px-5 py-6 text-white md:flex md:items-center md:justify-between md:px-8 md:py-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl md:text-3xl">Sell your craft on Atelier</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/78 md:text-sm">
                List handmade work, manage orders, and reach buyers who value Nigerian craft.
              </p>
            </div>
            <Link
              href="/become-a-vendor"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-burgundy transition hover:bg-surface-warm md:mt-0"
            >
              Become a vendor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
