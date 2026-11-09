import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoCustomerOrders, formatNaira } from "@/lib/demo-dashboard";

export default function AccountOverviewPage() {
  const recent = demoCustomerOrders[0];
  const totalSpent = demoCustomerOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">Welcome back! Here&apos;s a snapshot of your Atelier activity.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Orders" value={String(demoCustomerOrders.length)} hint="Last 90 days" />
        <StatCard label="Total spent" value={formatNaira(totalSpent)} />
        <StatCard label="Wishlist" value="5" hint="Saved pieces" />
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
              <p className="font-medium">{recent.id}</p>
              <p className="text-sm text-muted">
                {recent.date} · {recent.store}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={recent.status} />
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
          <p className="mt-2 font-medium">Update your details &amp; password</p>
        </Link>
      </section>
    </div>
  );
}
