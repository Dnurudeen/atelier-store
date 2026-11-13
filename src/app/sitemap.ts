import type { MetadataRoute } from "next";
import { getCategories, getProducts, getStores } from "@/lib/catalog";

const SITE = "https://www.atelierstore.studio";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, stores, products] = await Promise.all([getCategories(), getStores(), getProducts("per_page=60&sort=popular")]);
  const now = new Date();

  const staticPages = ["", "/shop", "/makers", "/about", "/help", "/contact", "/become-a-vendor", "/returns", "/shipping", "/terms", "/privacy"].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const categoryPages = categories.flatMap((c) => [c, ...(c.children ?? [])]).map((c) => ({
    url: `${SITE}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const storePages = stores.map((s) => ({ url: `${SITE}/makers/${s.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 }));

  const productPages = products.data.map((p) => ({
    url: `${SITE}/product/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...storePages, ...productPages];
}
