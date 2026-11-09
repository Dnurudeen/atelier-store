import type { LocalCartItem } from "@/store/cart";

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
  shippingAddress: CheckoutAddressInput,
  callbackUrl?: string
) {
  return {
    items: items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      quantity: item.quantity,
    })),
    shipping_address: {
      full_name: shippingAddress.full_name,
      phone: shippingAddress.phone,
      address_line: shippingAddress.address_line,
      city: shippingAddress.city,
      state: shippingAddress.state,
      country: shippingAddress.country || "Nigeria",
    },
    callback_url: callbackUrl,
  };
}

export function estimateCartShipping(items: LocalCartItem[]) {
  const fees = new Map<number, number>();
  for (const item of items) {
    const storeId = item.product.store?.id;
    if (!storeId) continue;
    if (!fees.has(storeId)) {
      fees.set(storeId, Number(item.product.store?.shipping_fee ?? 0));
    }
  }
  return Array.from(fees.values()).reduce((sum, fee) => sum + fee, 0);
}
