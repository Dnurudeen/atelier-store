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

    const products = await catalog.getProducts();
    expect(products.meta.total).toBe(demoProducts.length);

    const first = demoProducts[0];
    await expect(catalog.getProduct(first.slug)).resolves.toMatchObject({ id: first.id });
    await expect(catalog.getProduct("missing-slug")).resolves.toBeNull();

    const store = demoStores[0];
    await expect(catalog.getStore(store.slug)).resolves.toMatchObject({ id: store.id });
    const storeProducts = await catalog.getStoreProducts(store.slug);
    expect(storeProducts.data.every((p) => p.store?.slug === store.slug)).toBe(true);
  });

  it("never shows demo products in live mode when the api fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_DEMO", "false");
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { api } = await import("./api");
    vi.mocked(api).mockRejectedValue({ message: "network down", status: 0 });

    const catalog = await import("./catalog");

    await expect(catalog.getCategories()).resolves.toEqual([]);
    const products = await catalog.getProducts("category=fashion");
    expect(products.data).toEqual([]);
    expect(products.error).toBe(true);
    const feed = await catalog.getHomeFeed();
    expect(feed.error).toBe(true);
    expect(feed.deals).toEqual([]);
    await expect(catalog.getProduct("anything")).resolves.toBeNull();
  });

  it("finds categories and their parents in the tree", async () => {
    const { findCategory } = await import("./catalog");
    const tree = [{ id: 1, name: "Fashion", slug: "fashion", children: [{ id: 2, name: "Dresses", slug: "dresses" }] }];
    expect(findCategory(tree, "dresses")).toMatchObject({ category: { id: 2 }, parent: { id: 1 } });
    expect(findCategory(tree, "fashion")).toMatchObject({ category: { id: 1 }, parent: null });
    expect(findCategory(tree, "nope")).toBeNull();
  });
});
