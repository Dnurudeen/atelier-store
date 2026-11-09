import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { demoAdminStats, formatNaira } from "@/lib/demo-dashboard";

export default function AdminOverviewPage() {
  const { gmv, orders, vendors, pendingVendors, commissionCollected } = demoAdminStats;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">Platform health for the Atelier Nigeria marketplace.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV (30d)" value={formatNaira(gmv)} />
        <StatCard label="Orders" value={String(orders)} />
        <StatCard label="Active vendors" value={String(vendors)} hint={`${pendingVendors} pending review`} />
        <StatCard label="Commission" value={formatNaira(commissionCollected)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/vendors"
          className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30"
        >
          <p className="text-xs tracking-widest text-muted uppercase">Vendors</p>
          <p className="mt-2 font-medium">Review applications</p>
        </Link>
        <Link
          href="/admin/products"
          className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30"
        >
          <p className="text-xs tracking-widest text-muted uppercase">Moderation</p>
          <p className="mt-2 font-medium">Flagged listings</p>
        </Link>
        <Link
          href="/admin/payouts"
          className="rounded-2xl border border-border bg-white p-5 transition hover:border-burgundy/30"
        >
          <p className="text-xs tracking-widest text-muted uppercase">Payouts</p>
          <p className="mt-2 font-medium">Vendor disbursements</p>
        </Link>
      </div>
    </div>
  );
}
