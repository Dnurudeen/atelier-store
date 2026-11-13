import { describe, expect, it } from "vitest";
import { isOptionAvailable, matchVariant, optionGroups } from "./variants";

const variants = [
  { id: 1, name: "Red / S", stock: 0, attributes: { color: "Red", size: "S" } },
  { id: 2, name: "Red / M", stock: 3, attributes: { color: "Red", size: "M" } },
  { id: 3, name: "Blue / S", stock: 2, attributes: { color: "Blue", size: "S" } },
];

describe("variant helpers", () => {
  it("groups options in first-seen order with friendly labels", () => {
    expect(optionGroups(variants)).toEqual([
      { key: "color", label: "Colour", values: ["Red", "Blue"] },
      { key: "size", label: "Size", values: ["S", "M"] },
    ]);
  });

  it("matches only complete selections", () => {
    const groups = optionGroups(variants);
    expect(matchVariant(variants, groups, { color: "Red" })).toBeNull();
    expect(matchVariant(variants, groups, { color: "Red", size: "M" })?.id).toBe(2);
  });

  it("knows which options are still purchasable", () => {
    expect(isOptionAvailable(variants, { color: "Red" }, "size", "S")).toBe(false);
    expect(isOptionAvailable(variants, { color: "Blue" }, "size", "S")).toBe(true);
    expect(isOptionAvailable(variants, {}, "color", "Red")).toBe(true);
  });
});
