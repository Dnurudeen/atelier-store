"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";
import type { Category, Product } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { Input } from "@/components/ui/input";

type Props = {
  categories: Category[];
  products: Product[];
  total: number;
};

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function ShopCatalog({ categories, products, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "featured";
  const min = searchParams.get("min") || "";
  const max = searchParams.get("max") || "";

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) params.delete(key);
        else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const resultLabel = useMemo(() => {
    const parts = [`${total} ${total === 1 ? "piece" : "pieces"}`];
    if (q) parts.push(`for “${q}”`);
    if (category) {
      const name = categories.find((c) => c.slug === category)?.name;
      if (name) parts.push(`in ${name}`);
    }
    return parts.join(" ");
  }, [total, q, category, categories]);

  return (
    <div className="container-atelier py-10 md:py-14">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl">Shop</h1>
        <p className="mt-2 text-muted">Original art, fashion, ceramics, and more from verified makers.</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="sticky top-24 space-y-6 rounded-2xl border border-border bg-surface/40 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal size={16} className="text-burgundy" />
              Filters
            </div>

            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                pushParams({ q: String(fd.get("q") || "") });
              }}
            >
              <label className="text-xs font-medium tracking-wide text-muted uppercase">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input name="q" defaultValue={q} placeholder="Search products…" className="pl-9" />
              </div>
              <button
                type="submit"
                className="w-full rounded-full border border-border py-2 text-xs font-medium hover:border-burgundy hover:text-burgundy"
              >
                Apply search
              </button>
            </form>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => pushParams({ category: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-burgundy"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted uppercase">Price (₦)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={min}
                  onChange={(e) => pushParams({ min: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={max}
                  onChange={(e) => pushParams({ max: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide text-muted uppercase">Sort</label>
              <select
                value={sort}
                onChange={(e) => pushParams({ sort: e.target.value })}
                className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-burgundy"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {(category || q || min || max || sort !== "featured") && (
              <button
                type="button"
                onClick={() => router.push(pathname)}
                className="w-full text-sm font-medium text-crimson hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="mb-6 text-sm text-muted">{resultLabel}</p>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
              <p className="font-display text-xl">No products match your filters</p>
              <p className="mt-2 text-sm text-muted">Try adjusting category, price, or search terms.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
