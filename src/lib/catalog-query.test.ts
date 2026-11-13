import { describe, expect, it } from "vitest";
import { apiQuery, pageWindow, readFilters, toggleListValue, withParams } from "./catalog-query";

describe("catalog query helpers", () => {
  it("keeps only known, non-empty filters", () => {
    expect(readFilters({ q: " bag ", evil: "x", brand: ["nike", "ada"], min: "" })).toEqual({ q: "bag", brand: "nike" });
  });

  it("builds API queries with a default page size", () => {
    expect(apiQuery({ q: "bag" }, { category: "fashion" })).toBe("q=bag&category=fashion&per_page=40");
  });

  it("resets pagination when any other filter changes", () => {
    expect(withParams("q=bag&page=3", { sort: "price_asc" })).toBe("q=bag&sort=price_asc");
    expect(withParams("q=bag&page=3", { page: "4" })).toBe("q=bag&page=4");
    expect(withParams("q=bag&brand=ada", { brand: null })).toBe("q=bag");
  });

  it("toggles list values", () => {
    expect(toggleListValue("ada,nike", "nike")).toBe("ada");
    expect(toggleListValue("ada", "ada")).toBeNull();
    expect(toggleListValue(null, "ada")).toBe("ada");
  });

  it("windows long page lists", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, "…", 12]);
  });
});
