/** Local media helpers — prefer these over remote CDNs for reliability. */

export const media = {
  fallback: "/media/fallback.jpg",
  hero: (n: 1 | 2 | 3) => `/media/hero/hero-${n}.jpg`,
  category: (slug: string) => `/media/categories/${slug}.jpg`,
  product: (n: number) => `/media/products/product-${((n - 1) % 12) + 1}.jpg`,
  makerBanner: (n: number) => `/media/makers/banner-${((n - 1) % 8) + 1}.jpg`,
  makerAvatar: (n: number) => `/media/makers/avatar-${((n - 1) % 8) + 1}.jpg`,
};

export function resolveMediaUrl(url?: string | null, fallback = media.fallback) {
  if (!url || !String(url).trim()) return fallback;
  // Prefer local paths; keep absolute http(s) as-is for vendor uploads later
  return String(url);
}
