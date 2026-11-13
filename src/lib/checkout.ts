"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, type Product, type ProductVariant } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore, type LocalCartItem } from "@/store/cart";

export type CheckoutAddressInput = {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  country?: string;
};

export function mapCartToCheckoutPayload(
  items: LocalCartItem[],
  shippingAddress: CheckoutAddressInput | null,
  callbackUrl?: string,
  options: { addressId?: number | null; couponCode?: string | null } = {}
) {
  return {
    items: items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      quantity: item.quantity,
    })),
    ...(options.addressId
      ? { address_id: options.addressId }
      : shippingAddress
        ? {
            shipping_address: {
              full_name: shippingAddress.full_name,
              phone: shippingAddress.phone,
              address_line: shippingAddress.address_line,
              city: shippingAddress.city,
              state: shippingAddress.state,
              country: shippingAddress.country || "Nigeria",
            },
          }
        : {}),
    ...(options.couponCode ? { coupon_code: options.couponCode } : {}),
    callback_url: callbackUrl,
  };
}

/** Rough client-side estimate (one flat fee per seller). The server quote is authoritative. */
export function estimateCartShipping(items: LocalCartItem[]) {
  const fees = new Map<number, number>();
  for (const item of items) {
    const storeId = item.product.store?.id;
    if (!storeId) continue;
    if (!fees.has(storeId)) fees.set(storeId, Number(item.product.store?.shipping_fee ?? 0));
  }
  return Array.from(fees.values()).reduce((sum, fee) => sum + fee, 0);
}

export type QuoteIssue = "unavailable" | "choose_option" | "out_of_stock" | "limited_stock" | null;

export type QuoteLine = {
  key: string;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  requested_quantity: number;
  available: number;
  unit_price: number;
  total: number;
  issue: QuoteIssue;
  store_id: number | null;
  product: (Pick<Product, "id" | "name" | "slug" | "price" | "compare_at_price" | "stock" | "status" | "images"> & { store?: { id: number; name: string; slug: string } }) | null;
  variant: Pick<ProductVariant, "id" | "name" | "price" | "stock" | "attributes"> | null;
};

export type CartQuote = {
  lines: QuoteLine[];
  stores: { store: { id: number; name: string; slug: string; location?: string | null; logo?: string | null }; shipping_fee: number; subtotal: number }[];
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  voucher: { code: string; description?: string | null; discount: number; free_shipping: boolean } | null;
  voucher_error: string | null;
  has_issues: boolean;
};

export const ISSUE_TEXT: Record<Exclude<QuoteIssue, null>, string> = {
  unavailable: "This item is no longer available. Please remove it.",
  choose_option: "Please choose a size/colour for this item.",
  out_of_stock: "Out of stock. Please remove it to continue.",
  limited_stock: "Only a few left — we reduced the quantity.",
};

/**
 * Live server pricing for the browser cart. Also refreshes the cart's stored
 * product snapshots (price/stock) so the UI never shows stale numbers.
 */
export function useCartQuote(couponCode?: string | null) {
  const items = useCartStore((s) => s.items);
  const token = useAuthStore((s) => s.token);
  const body = items.map((i) => ({ product_id: i.productId, variant_id: i.variantId ?? null, quantity: i.quantity }));

  const query = useQuery({
    queryKey: ["cart-quote", body, couponCode ?? null, Boolean(token)],
    queryFn: async () =>
      (await api<{ data: CartQuote }>("/cart/quote", { method: "POST", body: { items: body, coupon_code: couponCode || undefined } })).data,
    enabled: items.length > 0,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  useEffect(() => {
    if (!data) return;
    const updates = data.lines
      .filter((l) => l.product && l.issue === "limited_stock" && l.quantity > 0)
      .map((l) => ({ key: l.key, quantity: l.quantity }));
    if (updates.length) useCartStore.getState().refresh(updates);
  }, [data]);

  return query;
}
