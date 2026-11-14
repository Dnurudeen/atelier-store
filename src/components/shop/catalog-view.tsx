import Link from "next/link";
import { SearchX } from "lucide-react";
import type { Category } from "@/lib/api";
import type { ProductPage } from "@/lib/catalog";
import { ProductCard } from "@/components/products/product-card";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Pagination } from "@/components/ui/pagination";
import { ActiveFilterChips, CatalogFilterSidebar, CatalogToolbar } from "@/components/shop/catalog-filters";

export function CatalogView({
  title,
  description,
  crumbs,
  result,
  categories,
  current,
  parent,
  basePath,
  query,
}: {
  title: string;
  description?: string | null;
  crumbs: Crumb[];
  result: ProductPage;
  categories: Category[];
  current?: Category | null;
  parent?: Category | null;
  basePath: string;
  query: string;
}) {
  const { data: products, meta, facets } = result;
  const subcategories = (current?.children ?? []).length ? current!.children! : [];

  return (
    <div className="bg-[var(--page-bg)] pb-12">
      <div className="container-atelier pt-4 md:pt-5">
        <Breadcrumbs items={crumbs} />

        {subcategories.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-md bg-white px-3 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-4">
            <div className="mobile-rail flex gap-2">
              {subcategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-border px-3.5 py-1.5 text-[13px] whitespace-nowrap hover:border-burgundy hover:text-burgundy"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-4 lg:gap-5">
          <CatalogFilterSidebar categories={categories} current={current} parent={parent} facets={facets} />

          <section className="min-w-0 flex-1">
            <header className="overflow-hidden rounded-md bg-white px-3.5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <h1 className="font-sans text-lg font-bold tracking-normal md:text-[22px]">
                    {title}
                    <span className="ml-2 text-[13px] font-normal text-muted md:text-sm">
                      ({meta.total.toLocaleString()} product{meta.total === 1 ? "" : "s"} found)
                    </span>
                  </h1>
                  {description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{description}</p>}
                </div>
                <CatalogToolbar categories={categories} current={current} parent={parent} facets={facets} total={meta.total} />
              </div>
              <div className="mt-3">
                <ActiveFilterChips facets={facets} />
              </div>
            </header>

            {result.error ? (
              <div className="mt-3 rounded-md bg-white px-4 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="font-semibold">We couldn&apos;t load products right now.</p>
                <p className="mt-1 text-sm text-muted">Please refresh the page in a moment.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="mt-3 flex flex-col items-center rounded-md bg-white px-4 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <SearchX className="h-12 w-12 text-muted" aria-hidden />
                <p className="mt-3 font-semibold">No products match your filters</p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Try removing a filter, checking the spelling, or searching for something more general.
                </p>
                <Link href={basePath} className="mt-4 rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-hover">
                  Clear all filters
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-3 rounded-md bg-white px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <Pagination current={meta.current_page} last={meta.last_page} basePath={basePath} query={query} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="bg-[var(--page-bg)] pb-12">
      <div className="container-atelier pt-4 md:pt-5">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="mt-4 flex items-start gap-4 lg:gap-5">
          <div className="hidden h-[640px] w-[270px] rounded-md bg-white lg:block" />
          <div className="min-w-0 flex-1">
            <div className="rounded-md bg-white p-4">
              <div className="skeleton mb-2 h-6 w-56 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-md bg-white">
                  <div className="skeleton aspect-square" />
                  <div className="space-y-2 p-2.5">
                    <div className="skeleton h-3 rounded" />
                    <div className="skeleton h-4 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
