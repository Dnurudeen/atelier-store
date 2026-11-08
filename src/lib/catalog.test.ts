import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoProducts } from "./demo-data";

vi.mock("./api", () => ({
  api: vi.fn(),
}));

describe("filterDemoProducts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("filters by category, query, price, and sort", async () => {
    const { filterDemoProducts } = await import("./catalog");
    const category = demoProducts[0]?.category?.slug;
    expect(category).toBeTruthy();

    const byCategory = filterDemoProducts({ category: category! });
    expect(byCategory.length).toBeGreaterThan(0);
    expect(byCategory.every((p) => p.category?.slug === category)).toBe(true);

    const byQuery = filterDemoProducts({ q: demoProducts[0].name.slice(0, 4) });
    expect(byQuery.some((p) => p.id === demoProducts[0].id)).toBe(true);

    const priced = filterDemoProducts({ min: 1_000_000, max: 1 });
    expect(priced).toHaveLength(0);

    const asc = filterDemoProducts({ sort: "price_asc" });
    for (let i = 1; i < asc.length; i += 1) {
      expect(Number(asc[i].price)).toBeGreaterThanOrEqual(Number(asc[i - 1].price));
    }

    const desc = filterDemoProducts({ sort: "price_desc" });
    for (let i = 1; i < desc.length; i += 1) {
      expect(Number(desc[i].price)).toBeLessThanOrEqual(Number(desc[i - 1].price));
    }

    const newest = filterDemoProducts({ sort: "newest" });
    for (let i = 1; i < newest.length; i += 1) {
      expect(newest[i].id).toBeLessThanOrEqual(newest[i - 1].id);
    }
  });
});

describe("catalog safe fallbacks", () => {
  it("returns demo data when USE_DEMO is true", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_DEMO", "true");
    vi.resetModules();

    const catalog = await import("./catalog");
    const { demoCategories, demoBanners, demoStores } = await import("./demo-data");

    await expect(catalog.getCategories()).resolves.toEqual(demoCategories);
    await expect(catalog.getBanners()).resolves.toEqual(demoBanners);
    await expect(catalog.getStores()).resolves.toEqual(demoStores);

    const featured = await catalog.getFeaturedProducts();
    expect(featured.every((p) => p.is_featured)).toBe(true);

    const products = await catalog.getProducts();
    expect(products.total).toBe(demoProducts.length);

    const first = demoProducts[0];
    await expect(catalog.getProduct(first.slug)).resolves.toMatchObject({ id: first.id });
    await expect(catalog.getProduct("missing-slug")).resolves.toBeNull();

    const store = demoStores[0];
    await expect(catalog.getStore(store.slug)).resolves.toMatchObject({ id: store.id });
    const storeProducts = await catalog.getStoreProducts(store.slug);
    expect(storeProducts.every((p) => p.store?.slug === store.slug)).toBe(true);
  });

  it("falls back to demo data when the api throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_DEMO", "false");
    vi.resetModules();

    const { api } = await import("./api");
    vi.mocked(api).mockRejectedValue(new Error("network down"));

    const catalog = await import("./catalog");
    const { demoCategories } = await import("./demo-data");

    await expect(catalog.getCategories()).resolves.toEqual(demoCategories);
  });
});
