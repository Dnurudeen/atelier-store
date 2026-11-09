"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, type Order } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { OrderStatus } from "@/lib/demo-dashboard";

function mapStatus(status: string): OrderStatus {
  if (status === "completed" || status === "delivered") return "delivered";
  if (status === "shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  if (status === "processing" || status === "paid") return "processing";
  return "pending";
}

export default function AccountOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [ordersRes, wishRes] = await Promise.all([
          api<{ data: Order[] }>("/account/orders"),
          api<{ data: unknown[] }>("/account/wishlist"),
        ]);
        setOrders(ordersRes.data || []);
        setWishlistCount(wishRes.data?.length || 0);
      } catch (err) {
        setError((err as { message?: string })?.message || "Unable to load account");
      }
    })();
  }, []);

  const recent = orders[0];
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">Welcome back! Here&apos;s a snapshot of your Atelier activity.</p>
      {error && <p className="text-sm text-crimson">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Orders" value={String(orders.length)} hint="All time" />
        <StatCard label="Total spent" value={formatNaira(totalSpent)} />
        <StatCard label="Wishlist" value={String(wishlistCount)} hint="Saved pieces" />
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Latest order</h2>
          <Link href="/account/orders" className="text-sm font-medium text-burgundy hover:underline">
            All orders
          </Link>
        </div>
        {recent ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface/50 p-4">
            <div>
              <p className="font-medium">{recent.order_number}</p>
              <p className="text-sm text-muted">
                {new Date(recent.created_at).toLocaleDateString()} ·{" "}
                {recent.sub_orders?.[0]?.store?.name || "Atelier"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={mapStatus(recent.status)} />
              <span className="font-semibold text-burgundy">{formatNaira(recent.total)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No orders yet.</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/account/addresses"
          className="rounded-2xl border border-border bg-surface-warm/50 p-5 transition hover:border-burgundy/30"
        >
          <p className="text-xs tracking-widest text-muted uppercase">Addresses</p>
          <p className="mt-2 font-medium">Manage delivery locations</p>
        </Link>
        <Link
          href="/account/profile"
          className="rounded-2xl border border-border bg-surface-warm/50 p-5 transition hover:border-burgundy/30"
        >
          <p className="text-xs tracking-widest text-muted uppercase">Profile</p>
          <p className="mt-2 font-medium">Update your details</p>
        </Link>
      </section>
    </div>
  );
}
