"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Tabs } from "@/components/account/account-card";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type ReturnRequest } from "@/lib/api";
import { formatDate } from "@/lib/account";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Row = ReturnRequest & { refund_amount?: string; sub_order?: { id: number; order?: { order_number: string } } };

export default function VendorReturnsPage() {
  const client = useQueryClient();
  const [tab, setTab] = useState<"requested" | "approved" | "all">("requested");
  const { data, isLoading } = useVendorQuery<{ data: Row[] }>("vendor-returns", `/vendor/returns${tab === "all" ? "" : `?status=${tab}`}`);
  const [acting, setActing] = useState<{ row: Row; action: "approve" | "reject" | "receive" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!acting) return;
    setBusy(true);
    try {
      await api(`/vendor/returns/${acting.row.id}`, { method: "PUT", body: { action: acting.action, note: note || undefined } });
      toast.success({ approve: "Return approved — the customer will send the item back.", reject: "Return declined.", receive: "Marked as received. The refund is now due." }[acting.action]);
      setActing(null);
      setNote("");
      void client.invalidateQueries({ queryKey: ["vendor-returns"] });
      void client.invalidateQueries({ queryKey: ["vendor-overview"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "requested", label: "New requests" },
          { value: "approved", label: "Awaiting item" },
          { value: "all", label: "All" },
        ]}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.data.length ? (
        <EmptyState icon={RotateCcw} title="No return requests here" text="Customers can request returns within 7 days of delivery. Respond within 2 business days to protect your seller score." />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-3 px-4 py-3 text-[13px]">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.quantity} × {r.item?.product_name}
                  {r.item?.variant_name ? ` (${r.item.variant_name})` : ""}
                </p>
                <p className="text-muted">
                  {r.reason_label} · {r.user?.name} · {formatDate(r.created_at)} ·{" "}
                  {r.sub_order && (
                    <Link href={`/vendor/orders/${r.sub_order.id}`} className="text-burgundy hover:underline">
                      Order {r.sub_order.order?.order_number}
                    </Link>
                  )}
                </p>
                {r.details && <p className="mt-1 whitespace-pre-line">{r.details}</p>}
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {r.photos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-16 w-16 overflow-hidden rounded border border-border">
                        <AppImage src={url} alt="Customer photo" fill sizes="64px" frameClassName="absolute inset-0" />
                      </a>
                    ))}
                  </div>
                )}
                {r.vendor_note && <p className="mt-1 text-muted">Your note: {r.vendor_note}</p>}
                {r.admin_note && <p className="mt-1 text-muted">Atelier: {r.admin_note}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={r.status} />
                <span className="font-semibold">{formatNaira(r.refund_amount ?? 0)}</span>
                <div className="flex gap-2">
                  {r.status === "requested" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setActing({ row: r, action: "reject" })}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => setActing({ row: r, action: "approve" })}>
                        Approve
                      </Button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <Button size="sm" onClick={() => setActing({ row: r, action: "receive" })}>
                      Item received
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(acting)}
        onClose={() => setActing(null)}
        title={acting ? { approve: "Approve return", reject: "Decline return", receive: "Confirm item received" }[acting.action] : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setActing(null)}>
              Back
            </Button>
            <Button onClick={() => void submit()} loading={busy} disabled={acting?.action === "reject" && note.trim().length < 3}>
              Confirm
            </Button>
          </>
        }
      >
        {acting?.action === "receive" && <p className="mb-3 text-sm">Only confirm once the item is physically back with you. The customer&apos;s refund becomes due and your share is deducted from your next statement.</p>}
        {acting?.action === "approve" && <p className="mb-3 text-sm">The customer will be asked to send the item back to you.</p>}
        <Textarea
          label={acting?.action === "reject" ? "Reason for declining (shown to the customer)" : "Note to the customer (optional)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </Modal>
    </Panel>
  );
}
