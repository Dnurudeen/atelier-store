"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Address, type Order, type PaginationMeta, type User } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type AccountOverview = {
  user: User;
  counts: {
    orders: number;
    ongoing: number;
    wishlist: number;
    unread: number;
    pending_reviews: number;
    vouchers: number;
    following: number;
  };
  total_spent: number;
  default_address: Address | null;
  recent_orders: Order[];
};

/** Shared query for the account sidebar badges and the overview page. */
export function useAccountOverview() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["account-overview", token],
    queryFn: async () => (await api<{ data: AccountOverview }>("/account/overview")).data,
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useAccountList<T>(key: string, path: string, enabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: [key, token, path],
    queryFn: async () => api<{ data: T; meta?: PaginationMeta & Record<string, unknown> }>(path),
    enabled: Boolean(token) && enabled,
  });
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** First image / name summary for an order card. */
export function orderPreview(order: Order) {
  const items = order.sub_orders?.flatMap((s) => s.items ?? []) ?? [];
  const first = items[0];
  const more = items.length - 1;
  return {
    image: first?.image ?? first?.product?.images?.[0]?.url ?? null,
    title: first ? `${first.product_name}${more > 0 ? ` + ${more} more item${more > 1 ? "s" : ""}` : ""}` : "Order",
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  };
}
