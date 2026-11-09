"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { OrderStatus } from "@/lib/demo-dashboard";

type VendorOrder = {
  id: number;
  status: string;
  total: number | string;
  tracking_number?: string | null;
  order?: { order_number?: string; created_at?: string };
};

function mapStatus(status: string): OrderStatus {
  if (status === "completed" || status === "delivered") return "delivered";
  if (status === "shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  if (status === "processing" || status === "paid") return "processing";
  return "pending";
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ data: VendorOrder[] }>("/vendor/orders");
    setOrders(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load orders"));
  }, []);

  async function markShipped(id: number) {
    await api(`/vendor/orders/${id}`, {
      method: "PUT",
      body: { status: "shipped" },
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Orders</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
          >
            <div>
              <p className="font-medium">{order.order?.order_number || `#${order.id}`}</p>
              <p className="text-sm text-muted">{formatNaira(order.total)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={mapStatus(order.status)} />
              {order.status !== "shipped" && order.status !== "completed" && (
                <Button size="sm" variant="outline" onClick={() => void markShipped(order.id)}>
                  Mark shipped
                </Button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && !error && <p className="text-sm text-muted">No orders yet.</p>}
      </div>
    </div>
  );
}
