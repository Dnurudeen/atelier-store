"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SellerScore } from "@/components/products/seller-score";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, type Store } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { OrderStatus } from "@/lib/demo-dashboard";

type Overview = {
  store: Store;
  stats: { orders: number; sales: number; products: number; earnings: number };
};

type VendorOrder = {
  id: number;
  status: string;
  total: number | string;
  created_at?: string;
  order?: { order_number?: string; created_at?: string };
};

function mapStatus(status: string): OrderStatus {
  if (status === "completed" || status === "delivered") return "delivered";
  if (status === "returned") return "returned";
  if (status === "shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  if (status === "processing" || status === "paid") return "processing";
  return "pending";
}

export default function VendorOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [ov, or] = await Promise.all([
          api<{ data: Overview }>("/vendor/overview"),
          api<{ data: VendorOrder[] }>("/vendor/orders"),
        ]);
        setOverview(ov.data);
        setOrders((or.data || []).slice(0, 5));
      } catch (err) {
        setError((err as { message?: string })?.message || "Unable to load vendor overview");
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        {overview?.store?.name || "Your store"}. Here&apos;s how your store is doing.
      </p>
      {error && <p className="text-sm text-crimson">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Orders" value={String(overview?.stats.orders ?? 0)} />
        <StatCard label="Sales" value={formatNaira(overview?.stats.sales ?? 0)} />
        <StatCard label="Products" value={String(overview?.stats.products ?? 0)} />
        <StatCard label="Pending balance" value={formatNaira(overview?.stats.earnings ?? 0)} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl">Seller performance</h2>
        <p className="mt-1 text-sm text-muted">Buyers see this score on your products and store.</p>
        <div className="mt-4 max-w-md">
          <SellerScore score={overview?.store.seller_score} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Recent orders</h2>
          <Link href="/vendor/orders" className="text-sm font-medium text-burgundy hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{order.order?.order_number || `#${order.id}`}</p>
                <p className="text-sm text-muted">
                  {order.order?.created_at
                    ? new Date(order.order.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={mapStatus(order.status)} />
                <span className="font-semibold text-burgundy">{formatNaira(order.total)}</span>
              </div>
            </li>
          ))}
          {orders.length === 0 && !error && (
            <li className="py-6 text-sm text-muted">No vendor orders yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
