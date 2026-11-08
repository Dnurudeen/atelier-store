import Link from "next/link";
import { HeroBanner } from "@/components/home/hero-banner";
import { CategoryGrid } from "@/components/home/category-grid";
import { MakersSpotlight } from "@/components/home/makers-spotlight";
import { ValueProps } from "@/components/home/value-props";
import { ProductCard } from "@/components/products/product-card";
import { getBanners, getCategories, getFeaturedProducts, getStores } from "@/lib/catalog";

export default async function HomePage() {
  const [banners, categories, featured, stores] = await Promise.all([
    getBanners(),
    getCategories(),
    getFeaturedProducts(),
    getStores(),
  ]);

  return (
    <>
      <HeroBanner banners={banners} />
      <ValueProps />
      <CategoryGrid categories={categories} />

      <section className="py-14 md:py-20">
        <div className="container-atelier">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-crimson uppercase">Curated</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl">Featured pieces</h2>
              <p className="mt-2 max-w-lg text-muted">
                A rotating selection of standout work from painters, ceramicists, and makers across the
                country.
              </p>
            </div>
            <Link
              href="/shop"
              className="text-sm font-medium text-burgundy underline-offset-4 hover:underline"
            >
              Shop all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      <MakersSpotlight stores={stores} />

      <section className="bg-burgundy py-16 text-white md:py-20">
        <div className="container-atelier flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl">Sell your craft on Atelier</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/78 md:text-base">
              Join a growing community of Nigerian artisans. List products, manage orders, and reach
              buyers who value handmade work.
            </p>
          </div>
          <Link
            href="/become-a-vendor"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-7 text-base font-medium text-crimson transition hover:bg-surface-warm"
          >
            Become a vendor
          </Link>
        </div>
      </section>
    </>
  );
}
