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
      <div className="container-atelier pt-3">
        <Breadcrumbs items={crumbs} />

        {subcategories.length > 0 && (
          <div className="mt-3 rounded-md bg-white p-3">
            <div className="mobile-rail flex gap-2">
              {subcategories.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="rounded-full border border-border px-3.5 py-1.5 text-[13px] whitespace-nowrap hover:border-burgundy hover:text-burgundy">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-3">
          <CatalogFilterSidebar categories={categories} current={current} parent={parent} facets={facets} />

          <section className="min-w-0 flex-1 rounded-md bg-white">
            <header className="space-y-2.5 border-b border-border px-3 py-3 md:px-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h1 className="font-sans text-lg font-bold tracking-normal md:text-xl">{title}</h1>
                <p className="text-[13px] text-muted">
                  {meta.total.toLocaleString()} product{meta.total === 1 ? "" : "s"} found
                </p>
              </div>
              {description && <p className="line-clamp-2 text-[13px] text-muted">{description}</p>}
              <CatalogToolbar categories={categories} current={current} parent={parent} facets={facets} total={meta.total} />
              <ActiveFilterChips facets={facets} />
            </header>

            {result.error ? (
              <div className="px-4 py-16 text-center">
                <p className="font-semibold">We couldn&apos;t load products right now.</p>
                <p className="mt-1 text-sm text-muted">Please refresh the page in a moment.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <SearchX className="h-12 w-12 text-muted" aria-hidden />
                <p className="mt-3 font-semibold">No products match your filters</p>
                <p className="mt-1 max-w-sm text-sm text-muted">Try removing a filter, checking the spelling, or searching for something more general.</p>
                <Link href={basePath} className="mt-4 rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-hover">
                  Clear all filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-border/60 p-px sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="border-t border-border px-3 py-4">
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
      <div className="container-atelier pt-3">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="mt-3 flex gap-3">
          <div className="hidden h-[600px] w-[250px] rounded-md bg-white lg:block" />
          <div className="flex-1 rounded-md bg-white p-3">
            <div className="skeleton mb-4 h-6 w-56 rounded" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton aspect-square rounded-md" />
                  <div className="skeleton h-3 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
