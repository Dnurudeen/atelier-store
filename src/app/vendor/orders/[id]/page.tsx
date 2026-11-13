"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, Printer, Truck } from "lucide-react";
import { Panel } from "@/components/layout/dashboard-shell";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Store, type SubOrder } from "@/lib/api";
import { formatDate } from "@/lib/account";
import { formatNaira } from "@/lib/utils";
import { useVendorQuery } from "@/lib/vendor";

type Detail = SubOrder & { order: NonNullable<SubOrder["order"]> & { user?: { name: string; email: string } } };

const ACTION_LABEL: Record<string, string> = {
  processing: "Start packing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
  returned: "Mark as returned",
};

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const { data, isLoading, error } = useVendorQuery<{ data: Detail; store: Pick<Store, "id" | "name" | "location"> }>("vendor-order", `/vendor/orders/${id}`);
  const [action, setAction] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error || !data) return <p className="rounded-md bg-white p-6 text-sm">Order not found. <Link href="/vendor/orders" className="font-semibold text-crimson">Back to orders</Link></p>;

  const sub = data.data;
  const address = sub.order.shipping_snapshot;
  const transitions = sub.allowed_transitions ?? [];

  async function submit() {
    if (!action) return;
    if (action === "shipped" && !tracking.trim() && !sub.tracking_number) {
      toast.error("Add the courier tracking number so the customer can follow the package.");
      return;
    }
    if (action === "cancelled" && !reason) {
      toast.error("Choose a reason for cancelling.");
      return;
    }
    setBusy(true);
    try {
      await api(`/vendor/orders/${sub.id}`, { method: "PUT", body: { status: action, tracking_number: tracking.trim() || undefined, reason: reason || undefined } });
      toast.success(`Order ${ACTION_LABEL[action]?.toLowerCase() ?? "updated"}.`);
      setAction(null);
      void client.invalidateQueries({ queryKey: ["vendor-order"] });
      void client.invalidateQueries({ queryKey: ["vendor-orders"] });
      void client.invalidateQueries({ queryKey: ["vendor-overview"] });
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the order."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/vendor/orders" className="text-sm font-semibold text-burgundy">
          ← All orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={15} /> Packing slip
          </Button>
          {transitions.map((t) => (
            <Button key={t} size="sm" variant={t === "cancelled" ? "outline" : "primary"} className={t === "cancelled" ? "border-crimson text-crimson" : ""} onClick={() => setAction(t)}>
              {ACTION_LABEL[t] ?? t}
            </Button>
          ))}
        </div>
      </div>

      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            Order {sub.order.order_number} <StatusBadge status={sub.status} />
          </span>
        }
        bodyClassName="grid gap-4 p-4 md:grid-cols-3"
      >
        <div className="text-[13px]">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Placed</p>
          <p>{formatDate(sub.order.created_at, true)}</p>
          {sub.shipped_at && <p className="mt-1 text-muted">Shipped {formatDate(sub.shipped_at)}</p>}
          {sub.delivered_at && <p className="text-muted">Delivered {formatDate(sub.delivered_at)}</p>}
          {sub.tracking_number && (
            <p className="mt-1 flex items-center gap-1">
              <Truck size={14} /> {sub.tracking_number}
            </p>
          )}
          {sub.cancel_reason && <p className="mt-1 text-crimson">Cancelled: {sub.cancel_reason}</p>}
        </div>
        <div className="text-[13px]">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Ship to</p>
          {address ? (
            <>
              <p className="font-semibold">{address.full_name}</p>
              <p className="flex gap-1">
                <MapPin size={14} className="mt-0.5 shrink-0 text-muted" />
                {address.address_line}, {address.city}, {address.state}
              </p>
              <p className="flex items-center gap-1">
                <Phone size={14} className="text-muted" />
                <a href={`tel:${address.phone}`} className="hover:underline">
                  {address.phone}
                </a>
              </p>
            </>
          ) : (
            <p className="text-muted">No address</p>
          )}
        </div>
        <div className="text-[13px]">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Your earnings</p>
          <dl className="space-y-0.5">
            <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{formatNaira(sub.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd>{formatNaira(sub.shipping_fee)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Commission</dt><dd>-{formatNaira(sub.commission ?? 0)}</dd></div>
            <div className="flex justify-between border-t border-border pt-1 font-bold"><dt>You receive</dt><dd>{formatNaira(sub.vendor_earning ?? 0)}</dd></div>
          </dl>
        </div>
      </Panel>

      <Panel title="Items to pack" bodyClassName="divide-y divide-border">
        {sub.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-surface print:hidden">
              <AppImage src={item.image ?? item.product?.images?.[0]?.url} alt="" fill sizes="56px" frameClassName="absolute inset-0" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.product_name}</p>
              <p className="text-muted">
                {item.variant_name ? `${item.variant_name} · ` : ""}
                SKU {item.variant?.sku || item.product?.sku || "—"}
              </p>
            </div>
            <span className="text-lg font-bold">×{item.quantity}</span>
            <span className="w-24 text-right">{formatNaira(item.total)}</span>
          </div>
        ))}
      </Panel>

      {sub.returns && sub.returns.length > 0 && (
        <Panel title="Return requests" action={<Link href="/vendor/returns" className="text-[13px] font-semibold text-crimson">Manage returns</Link>} bodyClassName="divide-y divide-border">
          {sub.returns.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
              <span>
                {r.quantity} × item · {r.reason_label}
              </span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </Panel>
      )}

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action ? ACTION_LABEL[action] ?? "Update order" : ""}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(null)}>
              Back
            </Button>
            <Button onClick={() => void submit()} loading={busy}>
              Confirm
            </Button>
          </>
        }
      >
        {action === "shipped" && (
          <Input label="Courier tracking number" placeholder="e.g. GIG-123456" value={tracking || sub.tracking_number || ""} onChange={(e) => setTracking(e.target.value)} hint="The customer sees this on their order page." />
        )}
        {action === "delivered" && <p className="text-sm">Confirm the customer has received this package. Your earnings move to your pending balance.</p>}
        {action === "processing" && <p className="text-sm">The customer will be told you&apos;re packing their order.</p>}
        {action === "returned" && <p className="text-sm">Use this only when the whole package has come back. Your earning for it is deducted from your next statement.</p>}
        {action === "cancelled" && (
          <div className="space-y-2 text-sm">
            <p>The customer is refunded in full and the stock is restored. Frequent cancellations lower your seller score.</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-md border border-border px-2" aria-label="Cancellation reason">
              <option value="">Choose a reason</option>
              <option>Out of stock</option>
              <option>Item damaged before shipping</option>
              <option>Customer unreachable</option>
              <option>Pricing error</option>
              <option>Other</option>
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}
