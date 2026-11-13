"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "@/lib/api";

const KEY = "atelier-recently-viewed";
const LIMIT = 18;
const EVENT = "atelier:recently-viewed";

type Snapshot = Pick<
  Product,
  "id" | "name" | "slug" | "price" | "compare_at_price" | "stock" | "rating" | "reviews_count" | "images" | "has_variants" | "status"
>;

let cache: { raw: string | null; value: Snapshot[] } = { raw: null, value: [] };

function read(): Snapshot[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (raw === cache.raw) return cache.value;
  try {
    cache = { raw, value: raw ? (JSON.parse(raw) as Snapshot[]) : [] };
  } catch {
    cache = { raw, value: [] };
  }
  return cache.value;
}

export function rememberProduct(product: Product) {
  const snap: Snapshot = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compare_at_price: product.compare_at_price,
    stock: product.stock,
    rating: product.rating,
    reviews_count: product.reviews_count,
    images: product.images?.slice(0, 1),
    has_variants: (product.variants?.length ?? 0) > 0 || product.has_variants,
    status: product.status,
  };
  const next = [snap, ...read().filter((p) => p.id !== product.id)].slice(0, LIMIT);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function clearRecentlyViewed() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const EMPTY: Snapshot[] = [];

export function useRecentlyViewed(): Product[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY) as Product[];
}
