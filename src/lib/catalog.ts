import { api, type Banner, type Brand, type Category, type PaginationMeta, type Product, type Store } from "./api";
import { demoBanners, demoCategories, demoProducts, demoStores } from "./demo-data";

/**
 * Server-side catalogue reads for storefront pages.
 *
 * - Results are cached briefly (ISR) so the storefront stays fast.
 * - Demo data is ONLY used when NEXT_PUBLIC_USE_DEMO=true. In live mode an API
 *   failure surfaces as an empty result with `error: true`, never fake products.
 */

const USE_DEMO = process.env.NEXT_PUBLIC_USE_DEMO === "true";
const REVALIDATE = 60;

export type HomeFeed = {
  deals: Product[];
  flash: Product[];
  flash_ends_at?: string | null;
  sponsored: Product[];
  top_sellers: Product[];
  new_arrivals: Product[];
  categories: { category: Category; products: Product[] }[];
  stores: { store: Store; products: Product[] }[];
  error?: boolean;
};

export type Facets = {
  brands: (Brand & { products_count: number })[];
  price: { min: number; max: number };
  colors: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  category_counts: Record<string, number>;
};

export type ProductPage = {
  data: Product[];
  meta: PaginationMeta;
  facets: Facets | null;
  error?: boolean;
};

const EMPTY_META: PaginationMeta = { current_page: 1, last_page: 1, per_page: 24, total: 0 };

async function read<T>(path: string): Promise<T> {
  return api<T>(path, { token: null, revalidate: REVALIDATE });
}

function logError(scope: string, err: unknown) {
  console.error(`[catalog] ${scope} failed:`, (err as { message?: string })?.message ?? err);
}

export async function getCategories(): Promise<Category[]> {
  if (USE_DEMO) return demoCategories;
  try {
    return (await read<{ data: Category[] }>("/categories")).data;
  } catch (err) {
    logError("categories", err);
    return [];
  }
}

export async function getBanners(): Promise<Banner[]> {
  if (USE_DEMO) return demoBanners;
  try {
    return (await read<{ data: Banner[] }>("/banners")).data;
  } catch (err) {
    logError("banners", err);
    return [];
  }
}

function endOfTodayLagosIso() {
  const now = new Date();
  // Africa/Lagos is UTC+1 year-round.
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), 22, 59, 59)).toISOString();
}

function demoHomeFeed(): HomeFeed {
  const deals = demoProducts.filter((p) => Number(p.compare_at_price) > Number(p.price)).slice(0, 12);
  return {
    deals,
    flash: deals,
    flash_ends_at: deals.length ? endOfTodayLagosIso() : null,
    sponsored: demoProducts.filter((p) => p.is_sponsored).slice(0, 12),
    top_sellers: demoProducts.slice(0, 12),
    new_arrivals: [...demoProducts].reverse().slice(0, 12),
    categories: demoCategories
      .map((category) => ({ category, products: demoProducts.filter((p) => p.category?.slug === category.slug).slice(0, 10) }))
      .filter((row) => row.products.length > 0),
    stores: demoStores
      .map((store) => ({ store, products: demoProducts.filter((p) => p.store?.slug === store.slug).slice(0, 8) }))
      .filter((row) => row.products.length > 0),
  };
}

export async function getHomeFeed(): Promise<HomeFeed> {
  if (USE_DEMO) return demoHomeFeed();
  try {
    const feed = (await read<{ data: Partial<HomeFeed> }>("/home-feed")).data;
    return {
      deals: feed.deals ?? [],
      flash: feed.flash ?? [],
      flash_ends_at: feed.flash_ends_at ?? null,
      sponsored: feed.sponsored ?? [],
      top_sellers: feed.top_sellers ?? [],
      new_arrivals: feed.new_arrivals ?? [],
      categories: feed.categories ?? [],
      stores: feed.stores ?? [],
    };
  } catch (err) {
    logError("home-feed", err);
    return { deals: [], flash: [], sponsored: [], top_sellers: [], new_arrivals: [], categories: [], stores: [], error: true };
  }
}

/** `query` is a URLSearchParams-style string without the leading "?". */
export async function getProducts(query = ""): Promise<ProductPage> {
  if (USE_DEMO) {
    const params = new URLSearchParams(query);
    const items = filterDemoProducts({
      category: params.get("category") ?? undefined,
      q: params.get("q") ?? undefined,
      min: Number(params.get("min")) || undefined,
      max: Number(params.get("max")) || undefined,
      sort: params.get("sort") ?? undefined,
    });
    return { data: items, meta: { ...EMPTY_META, total: items.length }, facets: null };
  }
  try {
    const res = await read<{ data: Product[]; meta: PaginationMeta; facets?: Facets | null }>(`/products${query ? `?${query}` : ""}`);
    return { data: res.data, meta: res.meta, facets: res.facets ?? null };
  } catch (err) {
    logError("products", err);
    return { data: [], meta: EMPTY_META, facets: null, error: true };
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (USE_DEMO) return demoProducts.find((p) => p.slug === slug) || null;
  try {
    return (await read<{ data: Product }>(`/products/${encodeURIComponent(slug)}`)).data;
  } catch (err) {
    if ((err as { status?: number })?.status !== 404) logError(`product ${slug}`, err);
    return null;
  }
}

export async function getRelated(slug: string): Promise<{ similar: Product[]; from_seller: Product[] }> {
  if (USE_DEMO) return { similar: demoProducts.slice(0, 8), from_seller: [] };
  try {
    return (await read<{ data: { similar: Product[]; from_seller: Product[] } }>(`/products/${encodeURIComponent(slug)}/related`)).data;
  } catch (err) {
    logError(`related ${slug}`, err);
    return { similar: [], from_seller: [] };
  }
}

export async function getStores(): Promise<Store[]> {
  if (USE_DEMO) return demoStores;
  try {
    return (await read<{ data: Store[] }>("/stores")).data;
  } catch (err) {
    logError("stores", err);
    return [];
  }
}

export async function getStore(slug: string): Promise<Store | null> {
  if (USE_DEMO) return demoStores.find((s) => s.slug === slug) || null;
  try {
    return (await read<{ data: Store }>(`/stores/${encodeURIComponent(slug)}`)).data;
  } catch (err) {
    if ((err as { status?: number })?.status !== 404) logError(`store ${slug}`, err);
    return null;
  }
}

export async function getStoreProducts(slug: string, query = ""): Promise<ProductPage> {
  if (USE_DEMO) {
    const items = demoProducts.filter((p) => p.store?.slug === slug);
    return { data: items, meta: { ...EMPTY_META, total: items.length }, facets: null };
  }
  try {
    const res = await read<{ data: Product[]; meta: PaginationMeta }>(`/stores/${encodeURIComponent(slug)}/products${query ? `?${query}` : ""}`);
    return { data: res.data, meta: res.meta, facets: null };
  } catch (err) {
    logError(`store products ${slug}`, err);
    return { data: [], meta: EMPTY_META, facets: null, error: true };
  }
}

/** Find a category (top-level or child) and its parent in the tree. */
export function findCategory(tree: Category[], slug: string): { category: Category; parent: Category | null } | null {
  for (const top of tree) {
    if (top.slug === slug) return { category: top, parent: null };
    const child = top.children?.find((c) => c.slug === slug);
    if (child) return { category: child, parent: top };
  }
  return null;
}

export function filterDemoProducts(params: { category?: string; q?: string; min?: number; max?: number; sort?: string }) {
  let items = [...demoProducts];
  if (params.category) items = items.filter((p) => p.category?.slug === params.category);
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) => p.name.toLowerCase().includes(q) || p.store?.name.toLowerCase().includes(q) || p.category?.name.toLowerCase().includes(q)
    );
  }
  if (params.min) items = items.filter((p) => Number(p.price) >= params.min!);
  if (params.max) items = items.filter((p) => Number(p.price) <= params.max!);
  switch (params.sort) {
    case "price_asc":
      items.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price_desc":
      items.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "newest":
      items.sort((a, b) => b.id - a.id);
      break;
    default:
      items.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }
  return items;
}
