import type { Product, SpecRow } from "@/lib/api";

export type VariantRow = { id?: number; attributes: Record<string, string>; sku: string; price: string; stock: string };

export type ProductDraft = {
  name: string;
  brand_name: string;
  parent_category_id: string;
  category_id: string;
  condition: "new" | "refurbished" | "used";
  description: string;
  key_features: string;
  whats_in_box: string;
  warranty: string;
  sku: string;
  price: string;
  compare_at_price: string;
  sale_ends_at: string;
  stock: string;
  low_stock_threshold: string;
  weight_kg: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  meta_title: string;
  meta_description: string;
  images: string[];
  specs: SpecRow[];
  options: { size: string[]; color: string[] };
  variants: VariantRow[];
};

export const EMPTY_DRAFT: ProductDraft = {
  name: "",
  brand_name: "",
  parent_category_id: "",
  category_id: "",
  condition: "new",
  description: "",
  key_features: "",
  whats_in_box: "",
  warranty: "",
  sku: "",
  price: "",
  compare_at_price: "",
  sale_ends_at: "",
  stock: "1",
  low_stock_threshold: "5",
  weight_kg: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  meta_title: "",
  meta_description: "",
  images: [],
  specs: [],
  options: { size: [], color: [] },
  variants: [],
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Turn an API product into an editable draft. */
export function draftFromProduct(p: Product): ProductDraft {
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id,
    attributes: Object.keys(v.attributes ?? {}).length ? (v.attributes as Record<string, string>) : { option: v.name },
    sku: str(v.sku),
    price: v.price && Number(v.price) > 0 ? str(Number(v.price)) : "",
    stock: str(v.stock),
  }));
  const collect = (key: string) => [...new Set(variants.map((v) => v.attributes[key]).filter(Boolean))];
  const parent = p.category?.parent ?? null;

  return {
    ...EMPTY_DRAFT,
    name: p.name,
    brand_name: p.brand?.name ?? "",
    parent_category_id: str(parent?.id ?? p.category?.id ?? ""),
    category_id: str(p.category_id ?? p.category?.id ?? ""),
    condition: p.condition ?? "new",
    description: str(p.description),
    key_features: str(p.key_features),
    whats_in_box: str(p.whats_in_box),
    warranty: str(p.warranty),
    sku: str(p.sku),
    price: str(Number(p.price)),
    compare_at_price: p.compare_at_price ? str(Number(p.compare_at_price)) : "",
    sale_ends_at: p.sale_ends_at ? p.sale_ends_at.slice(0, 16) : "",
    stock: str(p.stock),
    low_stock_threshold: str(p.low_stock_threshold ?? 5),
    weight_kg: p.weight_kg ? str(Number(p.weight_kg)) : "",
    length_cm: p.length_cm ? str(Number(p.length_cm)) : "",
    width_cm: p.width_cm ? str(Number(p.width_cm)) : "",
    height_cm: p.height_cm ? str(Number(p.height_cm)) : "",
    meta_title: str(p.meta_title),
    meta_description: str(p.meta_description),
    images: (p.images ?? []).map((i) => i.url),
    specs: p.spec_list ?? [],
    options: { size: collect("size"), color: collect("color") },
    variants,
  };
}

/** Rebuild the variant grid from option values, keeping existing rows (and their ids/stock) where they still apply. */
export function buildVariants(options: ProductDraft["options"], existing: VariantRow[]): VariantRow[] {
  const sizes = options.size.filter(Boolean);
  const colors = options.color.filter(Boolean);
  const combos: Record<string, string>[] = [];
  if (sizes.length && colors.length) colors.forEach((color) => sizes.forEach((size) => combos.push({ color, size })));
  else sizes.forEach((size) => combos.push({ size }));
  if (!sizes.length) colors.forEach((color) => combos.push({ color }));

  const key = (a: Record<string, string>) => JSON.stringify(Object.entries(a).sort());
  const byKey = new Map(existing.map((v) => [key(v.attributes), v]));
  return combos.map((attributes) => byKey.get(key(attributes)) ?? { attributes, sku: "", price: "", stock: "0" });
}

export function validateDraft(d: ProductDraft, submitting: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 3) e.name = "Give the product a clear name (at least 3 characters).";
  if (!d.category_id) e.category_id = "Choose a category.";
  const price = Number(d.price);
  if (!d.price || !Number.isFinite(price) || price < 1) e.price = "Enter a selling price.";
  if (d.compare_at_price && Number(d.compare_at_price) <= price) e.compare_at_price = "The old price must be higher than the selling price.";
  if (d.sale_ends_at && !d.compare_at_price) e.sale_ends_at = "Add an old price to run a timed sale.";
  if (!d.variants.length && (!d.stock || Number(d.stock) < 0)) e.stock = "Enter how many you have in stock.";
  if (d.variants.some((v) => v.stock === "" || Number(v.stock) < 0)) e.variants = "Enter stock for every option (0 if sold out).";
  if (submitting) {
    if (d.images.length === 0) e.images = "Add at least one photo.";
    if (d.description.trim().length < 30) e.description = "Describe the product in at least 30 characters.";
  }
  return e;
}

/** Shape the draft as the API payload. */
export function payloadFromDraft(d: ProductDraft, status: "draft" | "published") {
  const num = (v: string) => (v === "" ? null : Number(v));
  return {
    name: d.name.trim(),
    brand_name: d.brand_name.trim() || null,
    category_id: Number(d.category_id) || null,
    condition: d.condition,
    description: d.description.trim() || null,
    key_features: d.key_features.trim() || null,
    whats_in_box: d.whats_in_box.trim() || null,
    warranty: d.warranty.trim() || null,
    sku: d.sku.trim() || null,
    price: Number(d.price),
    compare_at_price: num(d.compare_at_price),
    sale_ends_at: d.sale_ends_at ? new Date(d.sale_ends_at).toISOString() : null,
    stock: d.variants.length ? d.variants.reduce((n, v) => n + Number(v.stock || 0), 0) : Number(d.stock || 0),
    low_stock_threshold: Number(d.low_stock_threshold || 5),
    weight_kg: num(d.weight_kg),
    length_cm: num(d.length_cm),
    width_cm: num(d.width_cm),
    height_cm: num(d.height_cm),
    meta_title: d.meta_title.trim() || null,
    meta_description: d.meta_description.trim() || null,
    specs: d.specs.filter((s) => s.label.trim() && s.value.trim()),
    images: d.images,
    variants: d.variants.map((v) => ({
      id: v.id,
      attributes: v.attributes,
      sku: v.sku.trim() || null,
      price: v.price ? Number(v.price) : null,
      stock: Number(v.stock || 0),
    })),
    status,
  };
}
