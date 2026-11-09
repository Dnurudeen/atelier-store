import { describe, expect, it } from "vitest";
import { estimateCartShipping, mapCartToCheckoutPayload } from "./checkout";
import type { LocalCartItem } from "@/store/cart";
import type { Product } from "./api";

function product(partial: Partial<Product> & Pick<Product, "id" | "name" | "price">): Product {
  return {
    slug: "item",
    description: "",
    stock: 5,
    status: "published",
    is_featured: false,
    rating: 5,
    reviews_count: 0,
    images: [],
    ...partial,
  } as Product;
}

function cartItem(overrides: Partial<LocalCartItem> & { product: Product }): LocalCartItem {
  return {
    key: `${overrides.product.id}:base`,
    productId: overrides.product.id,
    variantId: null,
    quantity: 1,
    ...overrides,
  };
}

describe("mapCartToCheckoutPayload", () => {
  it("maps cart lines to API product_id payload with shipping address", () => {
    const items = [
      cartItem({
        product: product({ id: 10, name: "Canvas", price: 20000 }),
        quantity: 2,
        variantId: 3,
      }),
      cartItem({
        product: product({ id: 11, name: "Print", price: 8000 }),
        quantity: 1,
      }),
    ];

    const payload = mapCartToCheckoutPayload(
      items,
      {
        full_name: "Ada Buyer",
        phone: "08012345678",
        address_line: "12 Admiralty Way",
        city: "Lagos",
        state: "Lagos",
      },
      "http://localhost:3000/checkout/success"
    );

    expect(payload).toEqual({
      items: [
        { product_id: 10, variant_id: 3, quantity: 2 },
        { product_id: 11, variant_id: null, quantity: 1 },
      ],
      shipping_address: {
        full_name: "Ada Buyer",
        phone: "08012345678",
        address_line: "12 Admiralty Way",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
      },
      callback_url: "http://localhost:3000/checkout/success",
    });
  });
});

describe("estimateCartShipping", () => {
  it("sums unique store shipping fees once per store", () => {
    const storeA = { id: 1, name: "A", slug: "a", status: "approved", shipping_fee: 2500 } as Product["store"];
    const storeB = { id: 2, name: "B", slug: "b", status: "approved", shipping_fee: 3000 } as Product["store"];

    const items = [
      cartItem({
        product: product({ id: 1, name: "One", price: 1000, store: storeA }),
        quantity: 2,
      }),
      cartItem({
        product: product({ id: 2, name: "Two", price: 2000, store: storeA }),
        quantity: 1,
      }),
      cartItem({
        product: product({ id: 3, name: "Three", price: 3000, store: storeB }),
        quantity: 1,
      }),
    ];

    expect(estimateCartShipping(items)).toBe(5500);
  });

  it("returns 0 when stores are missing", () => {
    const items = [
      cartItem({
        product: product({ id: 1, name: "Lone", price: 1000 }),
        quantity: 1,
      }),
    ];
    expect(estimateCartShipping(items)).toBe(0);
  });
});
