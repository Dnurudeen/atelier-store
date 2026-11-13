"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SubOrder } from "@/lib/api";
import { formatDate } from "@/lib/account";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Tab = "new" | "processing" | "shipped" | "delivered" | "closed" | "all";
type Row = SubOrder & { order: NonNullable<SubOrder["order"]> & { user?: { name: string } } };

function OrdersInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("status") as Tab) || "new");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const { data, isLoading } = useVendorQuery<{ data: Row[]; meta: { current_page: number; last_page: number; total: number; counts: Record<string, number> } }>(
    "vendor-orders",
    `/vendor/orders?status=${tab === "all" ? "" : tab}&q=${encodeURIComponent(query)}&page=${page}`
  );
  const counts = data?.meta.counts;

  return (
    <Panel bodyClassName="">
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          { value: "new", label: "To process", count: counts?.new },
          { value: "processing", label: "Packing", count: counts?.processing },
          { value: "shipped", label: "Shipped", count: counts?.shipped },
          { value: "delivered", label: "Delivered", count: counts?.delivered },
          { value: "closed", label: "Cancelled / returned", count: counts?.closed },
          { value: "all", label: "All" },
        ]}
      />
      <form
        className="flex gap-2 border-b border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
          setPage(1);
        }}
      >
        <label className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-burgundy">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order number or product" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <button className="h-9 rounded-md bg-burgundy px-4 text-sm font-semibold text-white">Search</button>
      </form>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !data?.data.length ? (
        <EmptyState icon={ShoppingBag} title={tab === "new" ? "No new orders right now" : "No orders here"} text="Paid orders appear here as soon as customers check out. You'll also get a notification." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Order</th>
                <th className="px-4 py-2.5 font-semibold">Items</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Total</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((row) => {
                const late = ["paid", "processing"].includes(row.status) && new Date(row.order.created_at).getTime() < now - 2 * 86400000;
                return (
                  <tr key={row.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.order.order_number}</p>
                      <p className="text-muted">{formatDate(row.order.created_at, true)}</p>
                      {late && <p className="text-[11px] font-semibold text-crimson">Ship today — over 2 days old</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface">
                          <AppImage src={row.items[0]?.image ?? row.items[0]?.product?.images?.[0]?.url} alt="" fill sizes="40px" frameClassName="absolute inset-0" />
                        </span>
                        <span className="line-clamp-2 max-w-[220px]">
                          {row.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.order.user?.name ?? row.order.shipping_snapshot?.full_name}</td>
                    <td className="px-4 py-3 font-semibold">{formatNaira(row.total)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/vendor/orders/${row.id}`} className="rounded-md border border-border px-3 py-1.5 font-semibold hover:border-burgundy">
                        {["paid", "processing"].includes(row.status) ? "Fulfil" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-border p-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            Page {data.meta.current_page} of {data.meta.last_page}
          </span>
          <button disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </Panel>
  );
}

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <OrdersInner />
    </Suspense>
  );
}
