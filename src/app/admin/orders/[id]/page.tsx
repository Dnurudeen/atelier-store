"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdmin, useAdminAction } from "@/lib/admin";
import { formatDate } from "@/lib/account";
import type { Order, SubOrder } from "@/lib/api";
import { formatNaira } from "@/lib/utils";

type Detail = Order & { user?: { name: string; email: string; phone?: string } };

const LABEL: Record<string, string> = { processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancel", returned: "Returned" };

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdmin<{ data: Detail }>(`/orders/${id}`);
  const action = useAdminAction();
  const [editing, setEditing] = useState<{ sub: SubOrder; to: string } | null>(null);
  const [reason, setReason] = useState("");
  const [tracking, setTracking] = useState("");

  if (isLoading || !data) return <ListSkeleton rows={5} />;
  const o = data.data;
  const a = o.shipping_snapshot;

  return (
    <div className="space-y-3">
      <Link href="/admin/orders" className="text-sm font-semibold text-burgundy">
        ← All orders
      </Link>
      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            Order {o.order_number} <StatusBadge status={o.status} /> <StatusBadge status={o.payment_status === "paid" ? "success" : o.payment_status} label={o.payment_status === "paid" ? "Paid" : undefined} />
          </span>
        }
        bodyClassName="grid gap-4 p-4 text-[13px] md:grid-cols-3"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Customer</p>
          <p className="font-semibold">{o.user?.name}</p>
          <p>{o.user?.email}</p>
          <p>{o.user?.phone}</p>
          <p className="mt-1 text-muted">Placed {formatDate(o.created_at, true)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Delivery address</p>
          {a ? (
            <p>
              {a.full_name}
              <br />
              {a.address_line}, {a.city}, {a.state}
              <br />
              {a.phone}
            </p>
          ) : (
            "—"
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Payment</p>
          <dl className="space-y-0.5">
            <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatNaira(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{formatNaira(o.shipping_total)}</dd></div>
            {Number(o.discount_total) > 0 && <div className="flex justify-between text-emerald-700"><dt>Voucher {o.coupon_code}</dt><dd>-{formatNaira(o.discount_total!)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-1 font-bold"><dt>Total</dt><dd>{formatNaira(o.total)}</dd></div>
          </dl>
          {o.payment && (
            <p className="mt-1 text-muted">
              Paystack ref {o.payment.reference} · {o.payment.status}
              {o.payment.failure_reason ? ` (${o.payment.failure_reason})` : ""}
            </p>
          )}
        </div>
      </Panel>

      {o.sub_orders.map((sub, i) => (
        <Panel
          key={sub.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              Package {i + 1} · {sub.store?.name} <StatusBadge status={sub.status} />
              {sub.refund_status && <StatusBadge status={sub.refund_status === "pending" ? "refund_due" : "refunded"} />}
            </span>
          }
          action={
            <div className="flex flex-wrap gap-1.5">
              {(sub.allowed_transitions ?? []).map((to) => (
                <Button key={to} size="sm" variant="outline" className={to === "cancelled" ? "border-crimson text-crimson" : ""} onClick={() => setEditing({ sub, to })}>
                  {LABEL[to] ?? to}
                </Button>
              ))}
              {sub.refund_status === "pending" && (
                <Button size="sm" onClick={() => action.mutate({ path: `/sub-orders/${sub.id}`, body: { refund_status: "refunded" }, success: "Refund marked as sent — customer notified" })}>
                  Mark refunded
                </Button>
              )}
            </div>
          }
          bodyClassName="divide-y divide-border text-[13px]"
        >
          {sub.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>
                {item.quantity} × {item.product?.slug ? <Link href={`/product/${item.product.slug}`} target="_blank" className="hover:text-burgundy">{item.product_name}</Link> : item.product_name}
                {item.variant_name && <span className="text-muted"> ({item.variant_name})</span>}
              </span>
              <span>{formatNaira(item.total)}</span>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-muted">
            <span>
              {sub.tracking_number ? `Tracking ${sub.tracking_number}` : "No tracking yet"}
              {sub.shipped_at ? ` · shipped ${formatDate(sub.shipped_at)}` : ""}
              {sub.delivered_at ? ` · delivered ${formatDate(sub.delivered_at)}` : ""}
              {sub.cancel_reason ? ` · cancelled: ${sub.cancel_reason}` : ""}
            </span>
            <span>
              Commission {formatNaira(sub.commission ?? 0)} · seller gets {formatNaira(sub.vendor_earning ?? 0)}
            </span>
          </div>
          {(sub.returns ?? []).length > 0 && (
            <div className="px-4 py-2.5">
              <Link href="/admin/returns" className="font-semibold text-crimson">
                {sub.returns!.length} return request(s) on this package
              </Link>
            </div>
          )}
        </Panel>
      ))}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `${LABEL[editing.to]} package` : ""}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Back
            </Button>
            <Button
              loading={action.isPending}
              disabled={editing?.to === "cancelled" && reason.trim().length < 3}
              onClick={() =>
                action.mutate(
                  { path: `/sub-orders/${editing!.sub.id}`, body: { status: editing!.to, reason: reason || undefined, tracking_number: tracking || undefined }, success: "Order updated" },
                  { onSuccess: () => { setEditing(null); setReason(""); setTracking(""); } }
                )
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm">This overrides the seller. The customer is notified.</p>
        {editing?.to === "shipped" && <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />}
        {editing?.to === "cancelled" && <Input label="Reason (shown to the customer)" value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Modal>
    </div>
  );
}
