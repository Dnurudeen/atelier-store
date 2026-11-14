"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AdminTable, useTableState } from "@/components/admin/admin-table";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { qs, useAdmin, useAdminAction, type Page } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { ReturnRequest } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Row = ReturnRequest & { refund_amount: string; refund_status?: string | null; sub_order?: { order?: { id: number; order_number: string } } };

const DECISIONS = {
  refund: "Refund the customer (item received / not needed back)",
  approve: "Approve: customer sends the item back to the seller",
  reject: "Close the case and side with the seller",
} as const;

function ReturnsInner() {
  const params = useSearchParams();
  const t = useTableState(params.get("status") ?? "escalated");
  const { data, isFetching } = useAdmin<Page<Row>>(`/returns${qs({ status: ["refunds", "all"].includes(t.tab) ? "" : t.tab, refunds: t.tab === "refunds", page: t.page })}`);
  const action = useAdminAction();
  const [deciding, setDeciding] = useState<Row | null>(null);
  const [decision, setDecision] = useState<keyof typeof DECISIONS>("refund");
  const [note, setNote] = useState("");

  return (
    <>
      <AdminTable<Row>
        tabs={[
          { value: "escalated", label: "Escalated" },
          { value: "requested", label: "Waiting for seller" },
          { value: "approved", label: "Item on its way back" },
          { value: "refunds", label: "Refunds to send" },
          { value: "all", label: "All" },
        ]}
        tab={t.tab}
        onTab={t.onTab}
        rows={data?.data}
        meta={data?.meta}
        loading={isFetching}
        page={t.page}
        onPage={t.setPage}
        empty="No returns here"
        minWidth={880}
        columns={[
          {
            key: "item",
            label: "Item & reason",
            render: (r) => (
              <div className="max-w-[300px]">
                <p className="font-medium">{r.quantity} × {r.item?.product_name}</p>
                <p className="text-muted">{r.reason_label}</p>
                {r.details && <p className="mt-1 line-clamp-3 whitespace-pre-line">{r.details}</p>}
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {r.photos.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="relative h-10 w-10 overflow-hidden rounded border border-border">
                        <AppImage src={u} alt="Evidence" fill sizes="40px" frameClassName="absolute inset-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          { key: "who", label: "Customer / seller", render: (r) => <span>{r.user?.name}<span className="block text-muted">{r.store?.name}</span></span> },
          { key: "order", label: "Order", render: (r) => (r.sub_order?.order ? <Link href={`/admin/orders/${r.sub_order.order.id}`} className="hover:text-burgundy">{r.sub_order.order.order_number}</Link> : "—") },
          { key: "notes", label: "Notes", render: (r) => <span className="text-muted">{r.vendor_note && <>Seller: {r.vendor_note}<br /></>}{r.admin_note && <>Admin: {r.admin_note}</>}</span> },
          { key: "amount", label: "Refund", render: (r) => <span className="font-semibold">{formatNaira(r.refund_amount)}<span className="block font-normal text-muted">{formatDate(r.created_at)}</span></span> },
          { key: "status", label: "Status", render: (r) => <span className="flex flex-col gap-1"><StatusBadge status={r.status} />{r.refund_status === "refunded" && <StatusBadge status="refunded" />}</span> },
          {
            key: "act",
            label: "",
            className: "text-right",
            render: (r) =>
              r.refund_status === "pending" ? (
                <Button size="sm" onClick={() => action.mutate({ path: `/returns/${r.id}`, body: { decision: "refunded" }, success: "Refund marked as sent" })}>
                  Mark refunded
                </Button>
              ) : ["escalated", "requested", "approved", "rejected"].includes(r.status) ? (
                <Button size="sm" variant="outline" onClick={() => setDeciding(r)}>
                  Decide
                </Button>
              ) : null,
          },
        ]}
      />
      <Modal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title="Resolve return"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeciding(null)}>
              Back
            </Button>
            <Button
              loading={action.isPending}
              onClick={() =>
                action.mutate(
                  { path: `/returns/${deciding!.id}`, body: { decision, note: note || undefined }, success: "Decision saved. Both parties notified" },
                  { onSuccess: () => { setDeciding(null); setNote(""); } }
                )
              }
            >
              Save decision
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          {(Object.keys(DECISIONS) as (keyof typeof DECISIONS)[]).map((k) => (
            <label key={k} className="flex items-start gap-2">
              <input type="radio" name="decision" checked={decision === k} onChange={() => setDecision(k)} className="mt-1 accent-[var(--crimson)]" />
              {DECISIONS[k]}
            </label>
          ))}
          <Textarea label="Note (shown to the customer)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
          {decision === "refund" && <p className="text-[12px] text-muted">The seller&apos;s share is deducted from their next statement.</p>}
        </div>
      </Modal>
    </>
  );
}

export default function AdminReturnsPage() {
  return (
    <Suspense>
      <ReturnsInner />
    </Suspense>
  );
}
