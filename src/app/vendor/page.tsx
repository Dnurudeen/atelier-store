import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoVendorOrders, demoVendorStats, formatNaira } from "@/lib/demo-dashboard";

export default function VendorOverviewPage() {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">Adebayo Studio — performance at a glance.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Sales (30d)" value={formatNaira(demoVendorStats.sales)} />
        <StatCard label="Orders" value={String(demoVendorStats.orders)} hint={`${demoVendorStats.pendingOrders} awaiting dispatch`} />
        <StatCard label="Products live" value={String(demoVendorStats.products)} />
      </div>

      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Recent orders</h2>
          <Link href="/vendor/orders" className="text-sm font-medium text-burgundy hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {demoVendorOrders.slice(0, 3).map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{order.id}</p>
                <p className="text-sm text-muted">{order.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="font-semibold text-burgundy">{formatNaira(order.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
