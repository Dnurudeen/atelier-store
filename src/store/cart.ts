"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariant } from "@/lib/api";

/** Must match CheckoutController::MAX_QTY_PER_LINE on the API. */
export const MAX_QTY_PER_LINE = 20;

export type LocalCartItem = {
  key: string;
  productId: number;
  variantId?: number | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
};

type CartState = {
  items: LocalCartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null) => number;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  /** Replace product/variant snapshots with fresh data from the server (prices, stock). */
  refresh: (items: { key: string; product?: Product; variant?: ProductVariant | null; quantity?: number }[]) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export function cartKey(productId: number, variantId?: number | null) {
  return `${productId}:${variantId || "base"}`;
}

/** Highest quantity allowed for a line given stock and the per-line cap. */
export function maxQuantity(product: Product, variant?: ProductVariant | null) {
  const stock = variant ? variant.stock : product.stock;
  return Math.max(0, Math.min(MAX_QTY_PER_LINE, Number(stock ?? 0)));
}

export function unitPrice(item: Pick<LocalCartItem, "product" | "variant">) {
  const variantPrice = item.variant?.price;
  return Number(variantPrice && Number(variantPrice) > 0 ? variantPrice : item.product.price);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (product, quantity = 1, variant = null) => {
        const key = cartKey(product.id, variant?.id);
        const cap = maxQuantity(product, variant);
        const existing = get().items.find((i) => i.key === key);
        const nextQty = Math.min(cap, (existing?.quantity ?? 0) + quantity);
        if (nextQty <= 0) return 0;

        if (existing) {
          set({ items: get().items.map((i) => (i.key === key ? { ...i, quantity: nextQty, product, variant } : i)) });
        } else {
          set({
            items: [...get().items, { key, productId: product.id, variantId: variant?.id ?? null, quantity: nextQty, product, variant }],
          });
        }
        return nextQty - (existing?.quantity ?? 0);
      },
      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      updateQuantity: (key, quantity) => {
        const item = get().items.find((i) => i.key === key);
        if (!item) return;
        if (quantity <= 0) {
          get().removeItem(key);
          return;
        }
        const capped = Math.min(quantity, maxQuantity(item.product, item.variant) || quantity);
        set({ items: get().items.map((i) => (i.key === key ? { ...i, quantity: capped } : i)) });
      },
      refresh: (updates) => {
        const byKey = new Map(updates.map((u) => [u.key, u]));
        set({
          items: get().items.map((i) => {
            const u = byKey.get(i.key);
            if (!u) return i;
            return {
              ...i,
              product: u.product ?? i.product,
              variant: u.variant === undefined ? i.variant : u.variant,
              quantity: u.quantity ?? i.quantity,
            };
          }),
        });
      },
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0),
      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "atelier-cart",
      // The drawer's open state is UI-only; never restore it on reload.
      partialize: (s) => ({ items: s.items }),
    }
  )
);
