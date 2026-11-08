import { api, type Banner, type Category, type Product, type Store } from "./api";
import { demoBanners, demoCategories, demoProducts, demoStores } from "./demo-data";

const USE_DEMO = process.env.NEXT_PUBLIC_USE_DEMO === "true";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (USE_DEMO) return fallback;
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getCategories(): Promise<Category[]> {
  return safe(async () => {
    const res = await api<{ data: Category[] }>("/categories");
    return res.data;
  }, demoCategories);
}

export async function getBanners(): Promise<Banner[]> {
  return safe(async () => {
    const res = await api<{ data: Banner[] }>("/banners");
    return res.data;
  }, demoBanners);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return safe(async () => {
    const res = await api<{ data: Product[] }>("/products?featured=1&per_page=8");
    return res.data;
  }, demoProducts.filter((p) => p.is_featured).slice(0, 8));
}

export async function getProducts(query = ""): Promise<{ data: Product[]; total: number }> {
  return safe(async () => {
    const res = await api<{ data: Product[]; meta: { total: number } }>(`/products${query}`);
    return { data: res.data, total: res.meta.total };
  }, {
    data: demoProducts,
    total: demoProducts.length,
  });
}

export async function getProduct(slug: string): Promise<Product | null> {
  return safe(async () => {
    const res = await api<{ data: Product }>(`/products/${slug}`);
    return res.data;
  }, demoProducts.find((p) => p.slug === slug) || null);
}

export async function getStores(): Promise<Store[]> {
  return safe(async () => {
    const res = await api<{ data: Store[] }>("/stores");
    return res.data;
  }, demoStores);
}

export async function getStore(slug: string): Promise<Store | null> {
  return safe(async () => {
    const res = await api<{ data: Store }>(`/stores/${slug}`);
    return res.data;
  }, demoStores.find((s) => s.slug === slug) || null);
}

export async function getStoreProducts(slug: string): Promise<Product[]> {
  return safe(async () => {
    const res = await api<{ data: Product[] }>(`/stores/${slug}/products`);
    return res.data;
  }, demoProducts.filter((p) => p.store?.slug === slug));
}

export function filterDemoProducts(params: {
  category?: string;
  q?: string;
  min?: number;
  max?: number;
  sort?: string;
}) {
  let items = [...demoProducts];
  if (params.category) {
    items = items.filter((p) => p.category?.slug === params.category);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.store?.name.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q)
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
