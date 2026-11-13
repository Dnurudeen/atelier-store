"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { Kpi, Panel } from "@/components/layout/dashboard-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Order } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Overview = {
  gmv: number;
  gmv_30d: number;
  commission: number;
  orders: number;
  paid_orders: number;
  vendors: number;
  customers: number;
  new_customers_30d: number;
  products_live: number;
  pending_vendors: number;
  pending_products: number;
  escalated_returns: number;
  refunds_due: number;
  pending_payouts: number;
  open_messages: number;
  series: { date: string; gmv: number; orders: number }[];
  recent_orders: (Order & { user?: { name: string } })[];
};

const compact = (v: number) => (v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}m` : v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${Math.round(v)}`);

export default function AdminDashboard() {
  const { data, isLoading } = useAdmin<{ data: Overview }>("/overview");
  const o = data?.data;

  if (isLoading || !o) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-md" />
        ))}
      </div>
    );
  }

  const queues = [
    { n: o.pending_vendors, label: "sellers waiting for approval", href: "/admin/vendors?status=pending" },
    { n: o.pending_products, label: "products waiting for review", href: "/admin/products?status=pending" },
    { n: o.escalated_returns, label: "escalated returns to decide", href: "/admin/returns?status=escalated", urgent: true },
    { n: o.refunds_due, label: "refunds to send", href: "/admin/orders?refunds=1", urgent: true },
    { n: o.pending_payouts, label: "seller payouts to pay", href: "/admin/payouts" },
    { n: o.open_messages, label: "open support messages", href: "/admin/messages" },
  ].filter((q) => q.n > 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="GMV (paid)" value={formatNaira(o.gmv)} hint={`${formatNaira(o.gmv_30d)} in the last 30 days`} />
        <Kpi label="Commission earned" value={formatNaira(o.commission)} tone="good" />
        <Kpi label="Orders" value={o.paid_orders.toLocaleString()} hint={`${o.orders.toLocaleString()} checkouts started`} href="/admin/orders" />
        <Kpi label="Customers" value={o.customers.toLocaleString()} hint={`+${o.new_customers_30d} in 30 days · ${o.vendors} sellers · ${o.products_live} live products`} href="/admin/users" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Daily GMV · last 30 days" bodyClassName="p-4">
          <BarChart
            ariaLabel="Daily paid order value over the last 30 days"
            format={compact}
            data={o.series.map((d) => ({ label: new Date(d.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" }), value: d.gmv, sub: `${d.orders} orders` }))}
          />
        </Panel>
        <Panel title="Needs attention" bodyClassName="divide-y divide-border">
          {queues.length === 0 ? (
            <p className="p-4 text-sm text-muted">All queues are clear.</p>
          ) : (
            queues.map((q) => (
              <Link key={q.label} href={q.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface">
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-bold ${q.urgent ? "bg-crimson text-white" : "bg-surface-warm text-burgundy"}`}>{q.n}</span>
                <span className="flex-1">{q.label}</span>
                <ArrowRight size={15} className="text-muted" />
              </Link>
            ))
          )}
        </Panel>
      </div>

      <Panel title="Latest orders" action={<Link href="/admin/orders" className="text-[13px] font-semibold text-crimson">All orders</Link>} bodyClassName="divide-y divide-border">
        {o.recent_orders.map((order) => (
          <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-surface">
            <span className="w-32 font-semibold">{order.order_number}</span>
            <span className="min-w-0 flex-1 truncate">{order.user?.name}</span>
            <span className="text-muted">{formatDate(order.created_at, true)}</span>
            <StatusBadge status={order.payment_status === "paid" ? order.status : order.payment_status} />
            <span className="w-24 text-right font-semibold">{formatNaira(order.total)}</span>
          </Link>
        ))}
      </Panel>
    </div>
  );
}
