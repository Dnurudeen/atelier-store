import { describe, expect, it } from "vitest";
import { media, resolveMediaUrl } from "./media";

describe("media helpers", () => {
  it("builds deterministic local asset paths", () => {
    expect(media.hero(2)).toBe("/media/hero/hero-2.jpg");
    expect(media.category("fine-art")).toBe("/media/categories/fine-art.jpg");
    expect(media.product(1)).toBe("/media/products/product-1.jpg");
    expect(media.product(13)).toBe("/media/products/product-1.jpg");
    expect(media.makerBanner(9)).toBe("/media/makers/banner-1.jpg");
    expect(media.makerAvatar(8)).toBe("/media/makers/avatar-8.jpg");
  });

  it("resolves empty urls to fallback and keeps valid urls", () => {
    expect(resolveMediaUrl(null)).toBe(media.fallback);
    expect(resolveMediaUrl("   ")).toBe(media.fallback);
    expect(resolveMediaUrl("/media/products/product-2.jpg")).toBe("/media/products/product-2.jpg");
    expect(resolveMediaUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });
});
