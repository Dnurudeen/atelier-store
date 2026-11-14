"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Kpi, Panel } from "@/components/layout/dashboard-shell";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/account";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";
import { useAuthStore } from "@/store/auth";

type Statement = { id: number; period_start: string; period_end: string; sales: string; commission: string; sponsored_fees: string; adjustments?: string; net: string; status: string };
type Payout = { id: number; amount: string; status: string; reference?: string | null; created_at: string; statement_id?: number | null };
type Payload = { pending: number; sales: number; commission: number; sponsored_fees: number; paid: number; statements: Statement[]; payouts: Payout[] };

export default function StatementsPage() {
  const { data, isLoading } = useVendorQuery<{ data: Payload }>("vendor-statements", "/vendor/statements");
  const store = useAuthStore((s) => s.user?.store);
  const [month, setMonth] = useState("");
  const rows = useMemo(() => (data?.data.statements ?? []).filter((r) => !month || r.period_end.slice(0, 7) === month), [data, month]);
  const p = data?.data;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending balance" value={formatNaira(p?.pending ?? 0)} hint="Delivered orders not yet on a statement" tone="good" />
        <Kpi label="Open sales" value={formatNaira(p?.sales ?? 0)} hint="This period" />
        <Kpi label="Commission" value={formatNaira(p?.commission ?? 0)} hint="This period" />
        <Kpi label="Paid out (all time)" value={formatNaira(p?.paid ?? 0)} />
      </div>

      <Panel title="How payouts work" bodyClassName="p-4 text-[13px] text-foreground/85">
        <ol className="list-decimal space-y-1 pl-5">
          <li>When an order is delivered, your share (items + delivery fee − commission) joins your pending balance.</li>
          <li>Each week we close a statement, deducting sponsored-ad fees and any returns received.</li>
          <li>The net amount is transferred to your bank account{store?.account_number_masked ? ` ending ${store.account_number_masked.slice(-4)}` : ""}.</li>
        </ol>
        {!store?.account_number_masked && (
          <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-amber-900">
            Add your bank details in <Link href="/vendor/settings#payout" className="font-semibold underline">Store settings</Link> so we can pay you.
          </p>
        )}
      </Panel>

      <Panel
        title="Statements"
        action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-md border border-border px-2 text-sm" aria-label="Filter by month" />}
      >
        {isLoading ? (
          <ListSkeleton />
        ) : !rows.length ? (
          <EmptyState icon={Wallet} title="No statements yet" text="Your first statement appears after the week in which your first order is delivered." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Period</th>
                  <th className="px-4 py-2.5 font-semibold">Sales</th>
                  <th className="px-4 py-2.5 font-semibold">Commission</th>
                  <th className="px-4 py-2.5 font-semibold">Ad fees</th>
                  <th className="px-4 py-2.5 font-semibold">Returns</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      {formatDate(r.period_start)} to {formatDate(r.period_end)}
                    </td>
                    <td className="px-4 py-2.5">{formatNaira(r.sales)}</td>
                    <td className="px-4 py-2.5">-{formatNaira(r.commission)}</td>
                    <td className="px-4 py-2.5">-{formatNaira(r.sponsored_fees)}</td>
                    <td className="px-4 py-2.5">{Number(r.adjustments ?? 0) ? formatNaira(r.adjustments!) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status === "paid" ? "success" : r.status} label={r.status === "paid" ? "Paid" : undefined} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">{formatNaira(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {(p?.payouts.length ?? 0) > 0 && (
        <Panel title="Payouts" bodyClassName="divide-y divide-border">
          {p!.payouts.map((po) => (
            <div key={po.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
              <span>
                {formatDate(po.created_at)}
                {po.reference && <span className="ml-2 text-muted">Ref {po.reference}</span>}
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge status={po.status === "paid" ? "success" : po.status} label={po.status === "paid" ? "Paid" : undefined} />
                <span className="font-semibold">{formatNaira(po.amount)}</span>
              </span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
