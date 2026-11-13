import type { ProductVariant } from "@/lib/api";

export type OptionGroup = { key: string; label: string; values: string[] };

const LABELS: Record<string, string> = { size: "Size", color: "Colour", colour: "Colour" };

/** Distinct option values per attribute, in first-seen order. */
export function optionGroups(variants: ProductVariant[]): OptionGroup[] {
  const order: string[] = [];
  const values: Record<string, string[]> = {};
  for (const v of variants) {
    for (const [key, raw] of Object.entries(v.attributes ?? {})) {
      if (!raw) continue;
      if (!values[key]) {
        values[key] = [];
        order.push(key);
      }
      if (!values[key].includes(raw)) values[key].push(raw);
    }
  }
  return order.map((key) => ({ key, label: LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1), values: values[key] }));
}

/** The variant matching every selected option, or null when incomplete/unknown. */
export function matchVariant(variants: ProductVariant[], groups: OptionGroup[], selected: Record<string, string>): ProductVariant | null {
  if (!groups.length) return null;
  if (groups.some((g) => !selected[g.key])) return null;
  return variants.find((v) => groups.every((g) => v.attributes?.[g.key] === selected[g.key])) ?? null;
}

/** Whether choosing `value` for `key` (keeping other selections) can lead to an in-stock variant. */
export function isOptionAvailable(variants: ProductVariant[], selected: Record<string, string>, key: string, value: string) {
  return variants.some(
    (v) =>
      v.stock > 0 &&
      v.attributes?.[key] === value &&
      Object.entries(selected).every(([k, val]) => k === key || !val || v.attributes?.[k] === val)
  );
}
