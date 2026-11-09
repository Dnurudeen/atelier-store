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

      <section className="py-8 md:py-20">
        <div className="container-atelier">
          <div className="mb-5 flex items-end justify-between gap-3 md:mb-10 md:flex-col md:items-stretch md:gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-crimson uppercase md:text-xs">
                Curated
              </p>
              <h2 className="mt-1 font-display text-2xl md:mt-2 md:text-4xl">Featured pieces</h2>
              <p className="mt-1.5 hidden max-w-lg text-muted md:mt-2 md:block">
                A rotating selection of standout work from painters, ceramicists, and makers across the
                country.
              </p>
            </div>
            <Link
              href="/shop"
              className="shrink-0 text-xs font-medium text-burgundy underline-offset-4 hover:underline md:text-sm"
            >
              Shop all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      <MakersSpotlight stores={stores} />

      <section className="bg-burgundy py-10 text-white md:py-20">
        <div className="container-atelier flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl md:text-4xl">Sell your craft on Atelier</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/78 md:mt-3 md:text-base">
              Join a growing community of Nigerian artisans. List products, manage orders, and reach
              buyers who value handmade work.
            </p>
          </div>
          <Link
            href="/become-a-vendor"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-crimson transition hover:bg-surface-warm md:h-12 md:px-7 md:text-base"
          >
            Become a vendor
          </Link>
        </div>
      </section>
    </>
  );
}
