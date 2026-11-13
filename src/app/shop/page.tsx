import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton, CatalogView } from "@/components/shop/catalog-view";
import { findCategory, getCategories, getProducts } from "@/lib/catalog";
import { apiQuery, readFilters, type RawParams } from "@/lib/catalog-query";

type Props = { searchParams: Promise<RawParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = readFilters(await searchParams);
  return {
    title: q ? `Results for “${q}”` : "Shop all products",
    description: "Shop handmade art, fashion, ceramics, leather and home pieces from verified Nigerian makers.",
  };
}

async function ShopContent({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = readFilters(raw);
  const [categories, result] = await Promise.all([getCategories(), getProducts(apiQuery(filters, { facets: "1" }))]);
  const found = filters.category ? findCategory(categories, filters.category) : null;
  const query = new URLSearchParams(filters as Record<string, string>).toString();

  const title = filters.q ? `Results for “${filters.q}”` : found ? found.category.name : "All products";

  return (
    <CatalogView
      title={title}
      crumbs={filters.q ? [{ label: "Search", href: "/shop" }, { label: filters.q }] : [{ label: "All products" }]}
      result={result}
      categories={categories}
      current={found?.category}
      parent={found?.parent}
      basePath="/shop"
      query={query}
    />
  );
}

export default function ShopPage(props: Props) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ShopContent {...props} />
    </Suspense>
  );
}
