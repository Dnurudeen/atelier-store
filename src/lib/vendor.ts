"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Product, type Store } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type VendorOverview = {
  store: Store & { seller_score?: Store["seller_score"] };
  stats: { orders: number; sales: number; products: number; earnings: number };
  series: { date: string; sales: number; orders: number }[];
  top_products: { product_id: number; product_name: string; units: number; revenue: number }[];
  low_stock: Pick<Product, "id" | "name" | "slug" | "stock" | "low_stock_threshold" | "status">[];
  todo: { to_process: number; late: number; returns: number; unanswered_reviews: number; rejected_products: number; pending_products: number };
  followers: number;
};

export function useVendorOverview() {
  const token = useAuthStore((s) => s.token);
  const isSeller = useAuthStore((s) => Boolean(s.user?.store));
  return useQuery({
    queryKey: ["vendor-overview", token],
    queryFn: async () => (await api<{ data: VendorOverview }>("/vendor/overview")).data,
    enabled: Boolean(token) && isSeller,
    staleTime: 30_000,
  });
}

/** Generic Seller Center list query. */
export function useVendorQuery<T>(key: string, path: string, enabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: [key, token, path],
    queryFn: async () => api<T>(path),
    enabled: Boolean(token) && enabled,
  });
}

export const STORE_STATUS_COPY: Record<string, { title: string; text: string }> = {
  pending: {
    title: "Your store is under review",
    text: "You can set up your store profile and prepare products as drafts. We'll email you as soon as it's approved (usually within 2 business days).",
  },
  rejected: {
    title: "Your store application was not approved",
    text: "Update your store details and contact support to request another review.",
  },
  suspended: {
    title: "Your store is suspended",
    text: "Your products are hidden and you can't sell until support restores your store.",
  },
};
