import { describe, expect, it } from "vitest";
import { buildVariants, EMPTY_DRAFT, payloadFromDraft, validateDraft } from "./product-form";

describe("product form helpers", () => {
  it("builds size × colour variants and keeps existing rows", () => {
    const first = buildVariants({ size: ["S", "M"], color: ["Red"] }, []);
    expect(first.map((v) => v.attributes)).toEqual([
      { color: "Red", size: "S" },
      { color: "Red", size: "M" },
    ]);
    first[0].stock = "4";
    const again = buildVariants({ size: ["S", "M", "L"], color: ["Red"] }, first);
    expect(again).toHaveLength(3);
    expect(again[0].stock).toBe("4");
    expect(buildVariants({ size: [], color: ["Blue", "Green"] }, [])).toHaveLength(2);
  });

  it("validates price, old price, stock and submission requirements", () => {
    const d = { ...EMPTY_DRAFT, name: "Ab", price: "100", compare_at_price: "90", stock: "" };
    const errs = validateDraft(d, true);
    expect(Object.keys(errs).sort()).toEqual(["category_id", "compare_at_price", "description", "images", "name", "stock"]);
    expect(validateDraft({ ...d, name: "Good name", category_id: "3", compare_at_price: "", stock: "2" }, false)).toEqual({});
  });

  it("sums variant stock into the payload and drops empty spec rows", () => {
    const d = {
      ...EMPTY_DRAFT,
      name: "Dress",
      category_id: "4",
      price: "1000",
      specs: [{ label: "Material", value: "Cotton" }, { label: "", value: "" }],
      variants: [
        { attributes: { size: "S" }, sku: "", price: "", stock: "2" },
        { attributes: { size: "M" }, sku: "D-M", price: "1200", stock: "3" },
      ],
    };
    const p = payloadFromDraft(d, "published");
    expect(p.stock).toBe(5);
    expect(p.specs).toHaveLength(1);
    expect(p.variants[1]).toMatchObject({ sku: "D-M", price: 1200, stock: 3 });
    expect(p.variants[0].price).toBeNull();
  });
});
