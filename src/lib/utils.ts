import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function discountPercent(
  price?: number | string | null,
  compareAt?: number | string | null
) {
  const current = Number(price);
  const previous = Number(compareAt);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= current || previous <= 0) {
    return null;
  }
  return Math.round((1 - current / previous) * 100);
}

export function formatRating(rating?: number | string | null, digits = 1) {
  const value = typeof rating === "string" ? Number(rating) : Number(rating ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(digits);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
