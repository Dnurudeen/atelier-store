"use client";

import Link from "next/link";
import { useState } from "react";
import { Package } from "lucide-react";
import { AccountCard, Tabs } from "@/components/account/account-card";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Order } from "@/lib/api";
import { formatDate, orderPreview, useAccountList } from "@/lib/account";
import { formatNaira } from "@/lib/utils";

type Tab = "ongoing" | "delivered" | "cancelled";

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("ongoing");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAccountList<Order[]>("orders", `/account/orders?status=${tab}&page=${page}`);
  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <AccountCard title="Orders">
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          { value: "ongoing", label: "Ongoing" },
          { value: "delivered", label: "Delivered" },
          { value: "cancelled", label: "Cancelled / Returned" },
        ]}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={tab === "ongoing" ? "You have no ongoing orders" : tab === "delivered" ? "No delivered orders yet" : "No cancelled or returned orders"}
          text="All your orders will be saved here for you to access their state anytime."
          action={{ label: "Continue shopping", href: "/shop" }}
        />
      ) : (
        <ul className="space-y-3 p-3 md:p-4">
          {orders.map((order) => {
            const p = orderPreview(order);
            const status = order.payment_status === "paid" ? order.status : order.payment_status;
            return (
              <li key={order.id} className="rounded-md border border-border">
                <div className="flex gap-3 p-3">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-surface">
                    <AppImage src={p.image} alt="" fill sizes="80px" frameClassName="absolute inset-0" />
                  </span>
                  <div className="min-w-0 flex-1 text-[13px]">
                    <p className="line-clamp-2 text-[14px] font-medium">{p.title}</p>
                    <p className="text-muted">Order {order.order_number}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="text-muted">On {formatDate(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-[14px] font-bold">{formatNaira(order.total)}</span>
                    <Link href={`/account/orders/${order.id}`} className="rounded-md px-2 py-1 text-[13px] font-bold text-crimson uppercase hover:bg-crimson/10">
                      See details
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-border p-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </AccountCard>
  );
}
