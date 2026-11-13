"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/lib/api";
import type { Facets } from "@/lib/catalog";
import { listValues, SORT_OPTIONS, toggleListValue, withParams } from "@/lib/catalog-query";
import { RatingStars } from "@/components/ui/rating-stars";
import { cn, formatNaira } from "@/lib/utils";

type Props = {
  categories: Category[];
  /** Category page: the active category (filters stay inside it). */
  current?: Category | null;
  parent?: Category | null;
  facets: Facets | null;
};

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(changes: Record<string, string | null>) {
    const qs = withParams(params.toString(), changes);
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, set, pending, pathname };
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-3 last:border-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span className="text-[12px] font-bold tracking-wide uppercase">{title}</span>
        <ChevronDown size={15} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px] hover:text-burgundy">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--crimson)]" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </label>
  );
}

function FilterPanel({ categories, current, parent, facets }: Props) {
  const { params, set } = useFilterNav();
  const [brandSearch, setBrandSearch] = useState("");
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const brands = listValues(params.get("brand"));
  const colors = listValues(params.get("color"));
  const sizes = listValues(params.get("size"));

  const top = parent ?? current ?? null;
  const categoryList = top ? top.children ?? [] : categories;

  const visibleBrands = useMemo(
    () => (facets?.brands ?? []).filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase())),
    [facets, brandSearch]
  );

  function applyPrice(e: FormEvent) {
    e.preventDefault();
    set({ min: min || null, max: max || null });
  }

  return (
    <div>
      <Section title="Category">
        <ul className="space-y-0.5 text-[13px]">
          {top && (
            <li>
              <Link href={`/category/${top.slug}`} className={cn("block py-1 hover:text-burgundy", current?.id === top.id && "font-bold text-burgundy")}>
                {top.name}
              </Link>
            </li>
          )}
          {categoryList.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}${params.toString() ? `?${withParams(params.toString(), { category: null })}` : ""}`}
                className={cn("block py-1 hover:text-burgundy", top && "pl-3", current?.id === c.id && "font-bold text-burgundy")}
              >
                {c.name}
                {facets?.category_counts?.[c.id] !== undefined && <span className="ml-1 text-muted">({facets.category_counts[c.id]})</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {(facets?.brands?.length ?? 0) > 0 && (
        <Section title="Brand">
          {(facets?.brands.length ?? 0) > 8 && (
            <input
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Search brands"
              className="mb-2 h-8 w-full rounded-md border border-border px-2.5 text-[13px] outline-none focus:border-burgundy"
            />
          )}
          <div className="max-h-52 overflow-y-auto pr-1">
            {visibleBrands.map((b) => (
              <CheckRow key={b.slug} checked={brands.includes(b.slug)} onChange={() => set({ brand: toggleListValue(params.get("brand"), b.slug) })}>
                {b.name} <span className="text-muted">({b.products_count})</span>
              </CheckRow>
            ))}
          </div>
        </Section>
      )}

      <Section title="Price (₦)">
        <form onSubmit={applyPrice} className="space-y-2">
          {facets?.price && facets.price.max > 0 && (
            <p className="text-[11px] text-muted">
              {formatNaira(facets.price.min)} – {formatNaira(facets.price.max)}
            </p>
          )}
          <div className="flex items-center gap-2">
            <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" aria-label="Minimum price" className="h-9 w-full min-w-0 rounded-md border border-border px-2.5 text-[13px] outline-none focus:border-burgundy" />
            <span className="text-muted">–</span>
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" aria-label="Maximum price" className="h-9 w-full min-w-0 rounded-md border border-border px-2.5 text-[13px] outline-none focus:border-burgundy" />
          </div>
          <button type="submit" className="h-8 w-full rounded-md border border-crimson text-[12px] font-bold text-crimson uppercase hover:bg-crimson hover:text-white">
            Apply
          </button>
        </form>
      </Section>

      <Section title="Discount percentage">
        {["50", "40", "30", "20", "10"].map((pct) => (
          <label key={pct} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px] hover:text-burgundy">
            <input type="radio" name="discount" checked={params.get("discount") === pct} onChange={() => set({ discount: pct })} className="h-4 w-4 accent-[var(--crimson)]" />
            {pct}% or more
          </label>
        ))}
        {params.get("discount") && (
          <button type="button" onClick={() => set({ discount: null })} className="mt-1 text-[12px] font-semibold text-burgundy hover:underline">
            Clear
          </button>
        )}
      </Section>

      <Section title="Product rating">
        {["4", "3", "2", "1"].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px]">
            <input type="radio" name="rating" checked={params.get("rating") === r} onChange={() => set({ rating: r })} className="h-4 w-4 accent-[var(--crimson)]" />
            <RatingStars value={Number(r)} size={13} /> <span className="text-muted">&amp; above</span>
          </label>
        ))}
      </Section>

      {(facets?.colors?.length ?? 0) > 0 && (
        <Section title="Colour">
          <div className="max-h-44 overflow-y-auto pr-1">
            {facets!.colors.map((c) => (
              <CheckRow key={c.value} checked={colors.includes(c.value)} onChange={() => set({ color: toggleListValue(params.get("color"), c.value) })}>
                {c.value} <span className="text-muted">({c.count})</span>
              </CheckRow>
            ))}
          </div>
        </Section>
      )}

      {(facets?.sizes?.length ?? 0) > 0 && (
        <Section title="Size">
          <div className="flex flex-wrap gap-1.5">
            {facets!.sizes.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set({ size: toggleListValue(params.get("size"), s.value) })}
                className={cn(
                  "min-w-9 rounded-md border px-2 py-1 text-[12px]",
                  sizes.includes(s.value) ? "border-crimson bg-crimson/10 font-semibold text-crimson" : "border-border hover:border-burgundy"
                )}
              >
                {s.value}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Availability" defaultOpen={false}>
        <CheckRow checked={params.get("in_stock") === "1"} onChange={() => set({ in_stock: params.get("in_stock") === "1" ? null : "1" })}>
          In stock only
        </CheckRow>
        <CheckRow checked={params.get("on_sale") === "1"} onChange={() => set({ on_sale: params.get("on_sale") === "1" ? null : "1" })}>
          On sale
        </CheckRow>
      </Section>

      <Section title="Condition" defaultOpen={false}>
        {(["new", "refurbished", "used"] as const).map((c) => (
          <CheckRow key={c} checked={listValues(params.get("condition")).includes(c)} onChange={() => set({ condition: toggleListValue(params.get("condition"), c) })}>
            <span className="capitalize">{c}</span>
          </CheckRow>
        ))}
      </Section>
    </div>
  );
}

/** Desktop sidebar. */
export function CatalogFilterSidebar(props: Props) {
  return (
    <aside className="hidden w-[250px] shrink-0 self-start rounded-md bg-white px-4 py-1 lg:block" aria-label="Filters">
      <FilterPanel {...props} />
    </aside>
  );
}

/** Mobile: "Filter" button + full-screen sheet, plus sort select. */
export function CatalogToolbar(props: Props & { total: number }) {
  const { params, set, pending } = useFilterNav();
  const [open, setOpen] = useState(false);
  const sort = params.get("sort") ?? "popular";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[13px] font-semibold lg:hidden"
        >
          <SlidersHorizontal size={15} /> Filter
        </button>
        <label className="ml-auto inline-flex items-center gap-2 text-[13px]">
          <span className="hidden text-muted sm:inline">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => set({ sort: e.target.value === "popular" ? null : e.target.value })}
            className="h-9 rounded-md border border-border bg-white px-2 text-[13px] font-semibold outline-none focus:border-burgundy"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-crimson border-r-transparent" aria-label="Updating results" />}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <p className="font-semibold">Filters</p>
            <button onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-md p-2 hover:bg-surface">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <FilterPanel {...props} />
          </div>
          <div className="safe-bottom flex gap-2 border-t border-border p-3">
            <button
              type="button"
              onClick={() =>
                // Keeps the search term (q) and sort; clears every refinement.
                set(Object.fromEntries(["brand", "min", "max", "rating", "discount", "on_sale", "in_stock", "condition", "color", "size"].map((k) => [k, null])))
              }
              className="h-11 flex-1 rounded-md border border-border text-sm font-semibold"
            >
              Reset
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 flex-[2] rounded-md bg-crimson text-sm font-semibold text-white">
              Show {props.total.toLocaleString()} results
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Removable chips for the active filters. */
export function ActiveFilterChips({ facets }: { facets: Facets | null }) {
  const { params, set } = useFilterNav();
  const chips: { label: string; change: Record<string, string | null> }[] = [];
  const brandName = (slug: string) => facets?.brands.find((b) => b.slug === slug)?.name ?? slug;

  if (params.get("q")) chips.push({ label: `“${params.get("q")}”`, change: { q: null } });
  listValues(params.get("brand")).forEach((b) => chips.push({ label: brandName(b), change: { brand: toggleListValue(params.get("brand"), b) } }));
  if (params.get("min") || params.get("max"))
    chips.push({
      label: `${params.get("min") ? formatNaira(params.get("min")!) : "₦0"} – ${params.get("max") ? formatNaira(params.get("max")!) : "any"}`,
      change: { min: null, max: null },
    });
  if (params.get("discount")) chips.push({ label: `${params.get("discount")}%+ off`, change: { discount: null } });
  if (params.get("rating")) chips.push({ label: `${params.get("rating")}★ & up`, change: { rating: null } });
  if (params.get("on_sale")) chips.push({ label: "On sale", change: { on_sale: null } });
  if (params.get("in_stock")) chips.push({ label: "In stock", change: { in_stock: null } });
  listValues(params.get("condition")).forEach((c) => chips.push({ label: c, change: { condition: toggleListValue(params.get("condition"), c) } }));
  listValues(params.get("color")).forEach((c) => chips.push({ label: c, change: { color: toggleListValue(params.get("color"), c) } }));
  listValues(params.get("size")).forEach((s) => chips.push({ label: `Size ${s}`, change: { size: toggleListValue(params.get("size"), s) } }));

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => set(chip.change)}
          className="inline-flex items-center gap-1 rounded-full border border-crimson/30 bg-crimson/5 px-2.5 py-1 text-[12px] font-medium text-crimson capitalize hover:bg-crimson/10"
        >
          {chip.label} <X size={12} />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() =>
            set(Object.fromEntries(["q", "brand", "min", "max", "rating", "discount", "on_sale", "in_stock", "condition", "color", "size"].map((k) => [k, null])))
          }
          className="text-[12px] font-semibold text-burgundy hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
