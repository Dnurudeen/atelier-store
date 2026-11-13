/** URL <-> filter helpers shared by the catalogue server page and its client controls. */

export type RawParams = Record<string, string | string[] | undefined>;

export const FILTER_KEYS = [
  "q",
  "category",
  "brand",
  "min",
  "max",
  "rating",
  "discount",
  "on_sale",
  "in_stock",
  "condition",
  "color",
  "size",
  "sort",
  "page",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export const SORT_OPTIONS = [
  { value: "popular", label: "Popularity" },
  { value: "newest", label: "Newest arrivals" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Product rating" },
  { value: "discount", label: "Biggest discount" },
] as const;

export const PER_PAGE = 40;

export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Normalise incoming search params to a clean string map of known filters. */
export function readFilters(params: RawParams): Partial<Record<FilterKey, string>> {
  const out: Partial<Record<FilterKey, string>> = {};
  for (const key of FILTER_KEYS) {
    const value = first(params[key]).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** Build the API query string for /products from page filters (+ forced category). */
export function apiQuery(filters: Partial<Record<FilterKey, string>>, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value) q.set(key, value);
  }
  if (!q.has("per_page")) q.set("per_page", String(PER_PAGE));
  return q.toString();
}

/**
 * Return a new query string with `changes` applied. `null`/"" removes a key.
 * Any change other than `page` resets pagination.
 */
export function withParams(current: string | URLSearchParams, changes: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams(current);
  let resetPage = false;
  for (const [key, value] of Object.entries(changes)) {
    if (key !== "page") resetPage = true;
    if (value === null || value === undefined || value === "") q.delete(key);
    else q.set(key, value);
  }
  if (resetPage) q.delete("page");
  return q.toString();
}

/** Toggle one value inside a comma-separated list param (e.g. brand=a,b). */
export function toggleListValue(list: string | null | undefined, value: string): string | null {
  const items = (list ?? "").split(",").filter(Boolean);
  const next = items.includes(value) ? items.filter((v) => v !== value) : [...items, value];
  return next.length ? next.join(",") : null;
}

export function listValues(list?: string | null): string[] {
  return (list ?? "").split(",").filter(Boolean);
}

/** Page numbers with ellipses, e.g. [1, "…", 4, 5, 6, "…", 12]. */
export function pageWindow(current: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}
