import { StatCard } from "@/components/dashboard/stat-card";
import { demoVendorEarnings, formatNaira } from "@/lib/demo-dashboard";

export default function VendorEarningsPage() {
  const { available, pending, lifetime, lastPayout, commissionRate } = demoVendorEarnings;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl">Earnings</h2>
        <p className="mt-1 text-sm text-muted">
          Payouts after platform fee ({commissionRate}% commission).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Available" value={formatNaira(available)} hint="Ready for payout" />
        <StatCard label="Pending" value={formatNaira(pending)} hint="Orders in transit" />
        <StatCard label="Lifetime" value={formatNaira(lifetime)} />
      </div>
      <section className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-display text-lg">Last payout</h3>
        <p className="mt-2 text-muted">
          {formatNaira(lastPayout.amount)} on {lastPayout.date} · Bank transfer
        </p>
      </section>
    </div>
  );
}
