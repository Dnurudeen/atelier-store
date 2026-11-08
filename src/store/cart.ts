"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariant } from "@/lib/api";

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
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

function makeKey(productId: number, variantId?: number | null) {
  return `${productId}:${variantId || "base"}`;
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
        const key = makeKey(product.id, variant?.id);
        const existing = get().items.find((i) => i.key === key);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                key,
                productId: product.id,
                variantId: variant?.id ?? null,
                quantity,
                product,
                variant,
              },
            ],
            isOpen: true,
          });
        }
      },
      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          get().removeItem(key);
          return;
        }
        set({
          items: get().items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        });
      },
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.price;
          return sum + Number(price) * item.quantity;
        }, 0),
      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "atelier-cart" }
  )
);
