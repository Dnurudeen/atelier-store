import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop/shop-catalog";
import { filterDemoProducts, getCategories, getProducts } from "@/lib/catalog";

const USE_DEMO = process.env.NEXT_PUBLIC_USE_DEMO === "true";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveProducts(searchParams: Record<string, string | string[] | undefined>) {
  const category = first(searchParams.category) || "";
  const q = first(searchParams.q) || "";
  const sort = first(searchParams.sort) || "featured";
  const min = Number(first(searchParams.min) || 0) || undefined;
  const max = Number(first(searchParams.max) || 0) || undefined;

  if (USE_DEMO) {
    const data = filterDemoProducts({ category, q, min, max, sort });
    return { data, total: data.length };
  }

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  if (sort) query.set("sort", sort);
  if (min) query.set("min_price", String(min));
  if (max) query.set("max_price", String(max));
  const qs = query.toString();
  return getProducts(qs ? `?${qs}` : "");
}

async function ShopPageContent({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const [categories, { data: products, total }] = await Promise.all([
    getCategories(),
    resolveProducts(resolved),
  ]);

  return <ShopCatalog categories={categories} products={products} total={total} />;
}

export default function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="container-atelier py-20 text-muted">Loading shop…</div>}>
      <ShopPageContent searchParams={searchParams} />
    </Suspense>
  );
}
