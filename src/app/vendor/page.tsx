"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, PlusCircle } from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { Kpi, Panel } from "@/components/layout/dashboard-shell";
import { SellerScore } from "@/components/products/seller-score";
import { StatusBadge } from "@/components/ui/status-badge";
import { useVendorOverview } from "@/lib/vendor";
import { formatNaira } from "@/lib/utils";

const compactNaira = (v: number) => (v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}m` : v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${Math.round(v)}`);

export default function VendorDashboardPage() {
  const { data, isLoading, error } = useVendorOverview();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-md" />
        ))}
        <div className="skeleton h-64 rounded-md sm:col-span-2 lg:col-span-4" />
      </div>
    );
  }
  if (error || !data) return <p className="rounded-md bg-white p-6 text-sm text-crimson">We couldn&apos;t load your dashboard. Please refresh.</p>;

  const { stats, todo, series } = data;
  const last30 = series.reduce((s, d) => s + d.sales, 0);
  const tasks = [
    { n: todo.to_process, label: "orders to process", href: "/vendor/orders?status=new", urgent: todo.late > 0, extra: todo.late ? `${todo.late} older than 2 days` : undefined },
    { n: todo.returns, label: "return requests to handle", href: "/vendor/returns" },
    { n: todo.unanswered_reviews, label: "reviews without a reply", href: "/vendor/reviews" },
    { n: todo.rejected_products, label: "rejected products to fix", href: "/vendor/products?status=rejected", urgent: true },
    { n: todo.pending_products, label: "products awaiting approval", href: "/vendor/products?status=pending" },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Welcome back,</p>
          <p className="text-xl font-bold">{data.store.name}</p>
        </div>
        <Link href="/vendor/products/new" className="inline-flex items-center gap-2 rounded-md bg-crimson px-4 py-2.5 text-sm font-semibold text-white hover:bg-crimson-hover">
          <PlusCircle size={16} /> Add a product
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sales (all time)" value={formatNaira(stats.sales)} hint={`${formatNaira(last30)} in the last 30 days`} />
        <Kpi label="Orders" value={stats.orders} hint={`${todo.to_process} to process`} href="/vendor/orders" tone={todo.late ? "alert" : "default"} />
        <Kpi label="Pending balance" value={formatNaira(stats.earnings)} hint="Paid when the week closes" href="/vendor/statements" tone="good" />
        <Kpi label="Products" value={stats.products} hint={`${data.followers} store follower${data.followers === 1 ? "" : "s"}`} href="/vendor/products" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Daily sales · last 30 days" bodyClassName="p-4">
          <BarChart
            ariaLabel="Daily sales over the last 30 days"
            format={compactNaira}
            data={series.map((d) => ({
              label: new Date(d.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
              value: d.sales,
              sub: `${d.orders} order${d.orders === 1 ? "" : "s"}`,
            }))}
          />
        </Panel>

        <Panel title="To do" bodyClassName="divide-y divide-border">
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-muted">You&apos;re all caught up. 🎉</p>
          ) : (
            tasks.map((t) => (
              <Link key={t.label} href={t.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface">
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-bold ${t.urgent ? "bg-crimson text-white" : "bg-surface-warm text-burgundy"}`}>{t.n}</span>
                <span className="flex-1">
                  {t.label}
                  {t.extra && (
                    <span className="flex items-center gap-1 text-[12px] text-crimson">
                      <AlertTriangle size={12} /> {t.extra}
                    </span>
                  )}
                </span>
                <ArrowRight size={15} className="text-muted" />
              </Link>
            ))
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Best sellers" bodyClassName="divide-y divide-border">
          {data.top_products.length === 0 ? (
            <p className="p-4 text-sm text-muted">Your best sellers will appear after your first sales.</p>
          ) : (
            data.top_products.map((p, i) => (
              <div key={p.product_id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="w-4 text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p.product_name}</span>
                <span className="text-muted">{p.units} sold</span>
                <span className="font-semibold">{formatNaira(p.revenue)}</span>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Low stock" action={<Link href="/vendor/inventory" className="text-[13px] font-semibold text-crimson">Manage</Link>} bodyClassName="divide-y divide-border">
          {data.low_stock.length === 0 ? (
            <p className="p-4 text-sm text-muted">No products are running low.</p>
          ) : (
            data.low_stock.map((p) => (
              <Link key={p.id} href={`/vendor/products/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-surface">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className={p.stock <= 0 ? "font-semibold text-crimson" : "font-semibold text-amber-700"}>{p.stock <= 0 ? "Out of stock" : `${p.stock} left`}</span>
              </Link>
            ))
          )}
        </Panel>

        <Panel title="Seller performance (4 weeks)" bodyClassName="p-4">
          <SellerScore score={data.store.seller_score} />
          <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            Store status: <StatusBadge status={data.store.status} />
          </p>
        </Panel>
      </div>
    </div>
  );
}
