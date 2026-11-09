"use client";

import { useEffect, useState } from "react";
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

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Order[] }>("/account/orders")
      .then((res) => setOrders(res.data || []))
      .catch((err) => setError(err?.message || "Unable to load orders"));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Your orders</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{order.order_number}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={mapStatus(order.status)} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-burgundy">
                  {formatNaira(order.total)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
