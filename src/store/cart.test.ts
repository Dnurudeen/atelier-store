import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "@/lib/api";
import { useCartStore } from "./cart";

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    name: "Lagos Canvas",
    slug: "lagos-canvas",
    price: 50000,
    stock: 5,
    status: "published",
    is_featured: true,
    images: [],
    ...overrides,
  }) as Product;

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
    window.localStorage.clear();
  });

  it("adds items and merges quantities without auto-opening any drawer", () => {
    const store = useCartStore.getState();
    store.addItem(product(), 1);
    store.addItem(product(), 2);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(state.isOpen).toBe(false);
    expect(state.count()).toBe(3);
    expect(state.subtotal()).toBe(150000);
  });

  it("keeps variant lines separate and uses variant price for subtotal", () => {
    const base = product({ id: 2, price: 10000 });
    useCartStore.getState().addItem(base, 1);
    useCartStore.getState().addItem(base, 1, {
      id: 9,
      name: "Large",
      stock: 2,
      price: 12000,
    });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.subtotal()).toBe(22000);
  });

  it("updates quantities and removes items at zero", () => {
    useCartStore.getState().addItem(product(), 2);
    const key = useCartStore.getState().items[0].key;

    useCartStore.getState().updateQuantity(key, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);

    useCartStore.getState().updateQuantity(key, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("supports open close toggle remove and clear", () => {
    const store = useCartStore.getState();
    store.open();
    expect(useCartStore.getState().isOpen).toBe(true);
    store.close();
    expect(useCartStore.getState().isOpen).toBe(false);
    store.toggle();
    expect(useCartStore.getState().isOpen).toBe(true);

    store.addItem(product(), 1);
    const key = useCartStore.getState().items[0].key;
    store.removeItem(key);
    expect(useCartStore.getState().items).toHaveLength(0);

    store.addItem(product(), 1);
    store.clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("caps quantities at stock and the per-line limit", () => {
    const limited = product({ id: 5, stock: 2 });
    expect(useCartStore.getState().addItem(limited, 5)).toBe(2);
    expect(useCartStore.getState().addItem(limited, 1)).toBe(0);
    useCartStore.getState().updateQuantity("5:base", 10);
    expect(useCartStore.getState().items.find((i) => i.key === "5:base")?.quantity).toBe(2);

    const plenty = product({ id: 6, stock: 500 });
    useCartStore.getState().addItem(plenty, 50);
    expect(useCartStore.getState().items.find((i) => i.key === "6:base")?.quantity).toBe(20);
  });

  it("refuses out-of-stock items", () => {
    expect(useCartStore.getState().addItem(product({ id: 7, stock: 0 }), 1)).toBe(0);
    expect(useCartStore.getState().items.find((i) => i.productId === 7)).toBeUndefined();
  });
});
