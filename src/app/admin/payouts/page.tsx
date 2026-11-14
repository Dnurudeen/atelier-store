"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdmin, useAdminAction } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Store } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Payout = {
  id: number;
  amount: string;
  commission: string;
  status: string;
  reference?: string | null;
  created_at: string;
  store?: Store;
  statement?: { period_start: string; period_end: string; sales: string; sponsored_fees: string; adjustments?: string } | null;
};

export default function AdminPayoutsPage() {
  const [filter, setFilter] = useState("pending");
  const { data, isLoading } = useAdmin<{ data: Payout[] }>(`/payouts${filter ? `?status=${filter}` : ""}`);
  const action = useAdminAction();
  const [paying, setPaying] = useState<Payout | null>(null);
  const [reference, setReference] = useState("");
  const [closing, setClosing] = useState(false);
  const total = (data?.data ?? []).reduce((n, p) => n + Number(p.amount), 0);

  return (
    <div className="space-y-3">
      <Panel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <p className="max-w-xl text-muted">
          Closing the week creates a statement and payout for every seller whose delivered earnings exceed their ad fees and return deductions. Pay each one by bank transfer, then record the transfer reference.
        </p>
        <Button onClick={() => setClosing(true)}>Close this week</Button>
      </Panel>

      <Panel
        title={`Payouts${filter === "pending" && total ? ` · ${formatNaira(total)} to pay` : ""}`}
        action={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 rounded-md border border-border px-2 text-[13px]" aria-label="Filter payouts">
            <option value="pending">To pay</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="">All</option>
          </select>
        }
      >
        {isLoading ? (
          <ListSkeleton />
        ) : !data?.data.length ? (
          <EmptyState icon={Wallet} title={filter === "pending" ? "No payouts waiting" : "No payouts"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="bg-surface text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Seller</th>
                  <th className="px-4 py-2.5 font-semibold">Bank account</th>
                  <th className="px-4 py-2.5 font-semibold">Period</th>
                  <th className="px-4 py-2.5 font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.store?.name}</td>
                    <td className="px-4 py-3">
                      {p.store?.account_number ? (
                        <>
                          {p.store.bank_name}
                          <span className="block font-mono">{p.store.account_number}</span>
                          <span className="block text-muted">{p.store.account_name}</span>
                        </>
                      ) : (
                        <span className="text-crimson">No bank details. Ask the seller to add them</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.statement ? `${formatDate(p.statement.period_start)} to ${formatDate(p.statement.period_end)}` : formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold">{formatNaira(p.amount)}</span>
                      <span className="block text-muted">commission {formatNaira(p.commission)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status === "paid" ? "success" : p.status} label={p.status === "paid" ? "Paid" : undefined} />
                      {p.reference && <span className="block text-muted">Ref {p.reference}</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.status !== "paid" && (
                        <span className="inline-flex gap-1.5">
                          <Button size="sm" onClick={() => setPaying(p)} disabled={!p.store?.account_number}>
                            Mark paid
                          </Button>
                          {p.status !== "failed" && (
                            <Button size="sm" variant="ghost" className="text-crimson" onClick={() => action.mutate({ path: `/payouts/${p.id}`, body: { status: "failed" }, success: "Marked as failed" })}>
                              Failed
                            </Button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title="Record payout"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaying(null)}>
              Back
            </Button>
            <Button
              loading={action.isPending}
              disabled={reference.trim().length < 3}
              onClick={() =>
                action.mutate(
                  { path: `/payouts/${paying!.id}`, body: { status: "paid", reference }, success: "Payout recorded. Seller notified" },
                  { onSuccess: () => { setPaying(null); setReference(""); } }
                )
              }
            >
              Mark paid
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm">
          Transfer <strong>{formatNaira(paying?.amount ?? 0)}</strong> to {paying?.store?.bank_name} {paying?.store?.account_number} ({paying?.store?.account_name}), then enter the bank&apos;s transfer reference.
        </p>
        <Input label="Transfer reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
      </Modal>

      <ConfirmDialog
        open={closing}
        tone="primary"
        title="Close this week?"
        message="Statements will be created for all sellers with a positive balance. This can't be undone."
        confirmLabel="Close week"
        loading={action.isPending}
        onConfirm={() => action.mutate({ path: "/statements/close", method: "POST", success: "Week closed. New payouts are listed below" }, { onSuccess: () => setClosing(false) })}
        onClose={() => setClosing(false)}
      />
    </div>
  );
}
