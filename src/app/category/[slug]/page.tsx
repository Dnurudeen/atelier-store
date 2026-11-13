import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSkeleton, CatalogView } from "@/components/shop/catalog-view";
import { findCategory, getCategories, getProducts } from "@/lib/catalog";
import { apiQuery, readFilters, type RawParams } from "@/lib/catalog-query";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = findCategory(await getCategories(), slug);
  if (!found) return { title: "Category not found" };
  return {
    title: `${found.category.name} | Prices & Deals`,
    description: found.category.description || `Shop ${found.category.name} from verified Nigerian makers on Atelier.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

async function CategoryContent({ params, searchParams }: Props) {
  const [{ slug }, raw, categories] = await Promise.all([params, searchParams, getCategories()]);
  const found = findCategory(categories, slug);
  if (!found) notFound();

  const filters = readFilters(raw);
  delete filters.category;
  const result = await getProducts(apiQuery(filters, { category: slug, facets: "1" }));
  const query = new URLSearchParams(filters as Record<string, string>).toString();

  const crumbs = found.parent
    ? [
        { label: found.parent.name, href: `/category/${found.parent.slug}` },
        { label: found.category.name },
      ]
    : [{ label: found.category.name }];

  return (
    <CatalogView
      title={found.category.name}
      description={found.category.description}
      crumbs={crumbs}
      result={result}
      categories={categories}
      current={found.category}
      parent={found.parent}
      basePath={`/category/${slug}`}
      query={query}
    />
  );
}

export default function CategoryPage(props: Props) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
