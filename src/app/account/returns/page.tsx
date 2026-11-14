"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type ReturnRequest } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";
import { formatNaira } from "@/lib/utils";

const NEXT_STEP: Record<string, string> = {
  requested: "Waiting for the seller to respond (usually within 2 business days).",
  approved: "Approved. Send the item back to the seller. Your refund starts once it arrives.",
  rejected: "The seller declined this return. If you disagree you can escalate it to Atelier.",
  escalated: "Atelier is reviewing your case. We'll update you here.",
  received: "Item received. Your refund is being processed to your original payment method.",
  resolved: "This case is closed.",
};

export default function ReturnsPage() {
  const client = useQueryClient();
  const { data, isLoading } = useAccountList<ReturnRequest[]>("returns", "/account/returns");
  const [escalating, setEscalating] = useState<ReturnRequest | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function escalate() {
    if (!escalating) return;
    setBusy(true);
    try {
      await api(`/account/returns/${escalating.id}/escalate`, { method: "POST", body: { note } });
      toast.success("Sent to Atelier support for review.");
      setEscalating(null);
      setNote("");
      void client.invalidateQueries({ queryKey: ["returns"] });
    } catch (err) {
      toast.error(errorMessage(err, "Could not escalate."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard title="Returns">
      {isLoading ? (
        <ListSkeleton />
      ) : !data?.data.length ? (
        <EmptyState icon={RotateCcw} title="You have no returns" text={<>To return an item, open a delivered order and choose <strong>Return item</strong>. You have 7 days after delivery.</>} action={{ label: "View orders", href: "/account/orders" }} />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((r) => (
            <li key={r.id} className="px-4 py-3 text-[13px]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.quantity} × {r.item?.product_name ?? "Item"}
                  </p>
                  <p className="text-muted">
                    {r.reason_label} · Requested {formatDate(r.created_at)} · Sold by {r.store?.name}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  <p className="mt-1 font-semibold">{formatNaira((r as ReturnRequest & { refund_amount?: string }).refund_amount ?? 0)}</p>
                </div>
              </div>
              <p className="mt-1.5 rounded bg-surface px-2 py-1.5 text-foreground/80">{NEXT_STEP[r.status]}</p>
              {r.vendor_note && <p className="mt-1 text-muted">Seller: {r.vendor_note}</p>}
              {r.admin_note && <p className="mt-1 text-muted">Atelier: {r.admin_note}</p>}
              <div className="mt-2 flex gap-3">
                {r.sub_order && (
                  <Link href={`/account/orders/${r.sub_order.order_id}`} className="font-semibold text-burgundy hover:underline">
                    View order
                  </Link>
                )}
                {r.status === "rejected" && (
                  <button type="button" onClick={() => setEscalating(r)} className="font-semibold text-crimson hover:underline">
                    Escalate to Atelier
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(escalating)}
        onClose={() => setEscalating(null)}
        title="Escalate this return"
        footer={
          <>
            <Button variant="outline" onClick={() => setEscalating(null)}>
              Cancel
            </Button>
            <Button onClick={() => void escalate()} loading={busy} disabled={note.trim().length < 5}>
              Send to Atelier
            </Button>
          </>
        }
      >
        <Textarea label="Tell us why the seller's decision isn't right" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} />
      </Modal>
    </AccountCard>
  );
}
