import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, MapPin, Package, Search, Users } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { SellerScore } from "@/components/products/seller-score";
import { ShareLinks } from "@/components/products/share-links";
import { StoreFollowButton } from "@/components/shop/store-follow-button";
import { AppImage } from "@/components/ui/app-image";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import { RatingStars } from "@/components/ui/rating-stars";
import { getStore, getStoreProducts } from "@/lib/catalog";
import { apiQuery, readFilters, SORT_OPTIONS, type RawParams } from "@/lib/catalog-query";
import { media } from "@/lib/media";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Store not found" };
  return { title: `${store.name} Official Store`, description: store.bio || `${store.name} on Atelier Nigeria` };
}

export default function StorePage(props: PageProps) {
  return (
    <Suspense fallback={<PageLoader label="Opening the store" />}>
      <StoreContent {...props} />
    </Suspense>
  );
}

async function StoreContent({ params, searchParams }: PageProps) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const store = await getStore(slug);
  if (!store || store.status !== "approved") notFound();

  const filters = readFilters(raw);
  const result = await getStoreProducts(slug, apiQuery({ q: filters.q, sort: filters.sort, page: filters.page }));
  const query = new URLSearchParams(Object.entries({ q: filters.q, sort: filters.sort }).filter(([, v]) => v) as [string, string][]).toString();
  const since = store.created_at ? new Date(store.created_at).getFullYear() : null;

  return (
    <div className="bg-[var(--page-bg)] pb-12">
      <div className="container-atelier pt-3">
        <Breadcrumbs items={[{ label: "Official stores", href: "/makers" }, { label: store.name }]} />

        <section className="mt-3 overflow-hidden rounded-md bg-white">
          <div className="relative h-32 bg-burgundy md:h-52">
            <AppImage src={store.banner || media.makerBanner(store.id)} alt="" fill priority sizes="100vw" frameClassName="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
          <div className="flex flex-col gap-4 px-4 pb-4 md:flex-row md:items-end md:justify-between md:px-6">
            <div className="flex items-end gap-4">
              <div className="relative -mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-md border-4 border-white bg-white shadow md:-mt-14 md:h-28 md:w-28">
                <AppImage src={store.logo || media.makerAvatar(store.id)} alt={`${store.name} logo`} fill sizes="112px" frameClassName="absolute inset-0" />
              </div>
              <div className="min-w-0 pt-2">
                <h1 className="flex items-center gap-1.5 font-sans text-xl font-bold tracking-normal md:text-2xl">
                  {store.name} <BadgeCheck size={20} className="shrink-0 text-crimson" aria-label="Verified seller" />
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  {Number(store.rating) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <RatingStars value={store.rating} size={13} /> {Number(store.rating).toFixed(1)}
                    </span>
                  )}
                  {store.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {store.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Package size={13} /> {store.products_count ?? result.meta.total} products
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} /> {store.followers_count ?? 0} followers
                  </span>
                  {since && <span>Selling since {since}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShareLinks path={`/makers/${store.slug}`} title={store.name} />
              <StoreFollowButton store={store} />
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {store.bio && (
              <div className="rounded-md bg-white p-4">
                <h2 className="text-[13px] font-bold tracking-wide uppercase">About the store</h2>
                <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-foreground/85">{store.bio}</p>
              </div>
            )}
            <div className="rounded-md bg-white p-4">
              <h2 className="mb-2 text-[13px] font-bold tracking-wide uppercase">Seller performance</h2>
              <SellerScore score={store.seller_score} />
            </div>
          </aside>

          <section className="min-w-0 rounded-md bg-white">
            <form className="flex flex-wrap items-center gap-2 border-b border-border p-3" action={`/makers/${store.slug}`}>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-burgundy">
                <Search size={15} className="text-muted" />
                <input name="q" defaultValue={filters.q} placeholder={`Search in ${store.name}`} className="w-full bg-transparent text-[13px] outline-none" />
              </label>
              <select name="sort" defaultValue={filters.sort ?? "popular"} className="h-9 rounded-md border border-border bg-white px-2 text-[13px] font-semibold" aria-label="Sort products">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button className="h-9 rounded-md bg-crimson px-4 text-[13px] font-semibold text-white hover:bg-crimson-hover">Go</button>
            </form>
            <p className="px-3 pt-3 text-[13px] text-muted">{result.meta.total.toLocaleString()} products found</p>
            {result.data.length === 0 ? (
              <p className="px-3 py-14 text-center text-sm text-muted">{filters.q ? `No products match “${filters.q}”.` : "This store has no products listed yet."}</p>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-border/60 p-px sm:grid-cols-3 md:grid-cols-4">
                {result.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            <div className="border-t border-border px-3 py-4">
              <Pagination current={result.meta.current_page} last={result.meta.last_page} basePath={`/makers/${store.slug}`} query={query} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
