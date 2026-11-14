"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Truck, X } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { ImageUploader } from "@/components/ui/image-uploader";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors, type Order, type OrderItem, type SubOrder } from "@/lib/api";
import { formatDate, useAccountList } from "@/lib/account";
import { cn, formatNaira } from "@/lib/utils";

type DetailSub = SubOrder & { can_cancel?: boolean; return_deadline?: string | null };
type DetailItem = OrderItem & { can_review?: boolean; returnable_quantity?: number };

const RETURN_REASONS: Record<string, string> = {
  damaged: "Item arrived damaged",
  wrong_item: "Wrong item delivered",
  not_as_described: "Not as described",
  missing_parts: "Missing parts or accessories",
  size_fit: "Size or fit issue",
  changed_mind: "Changed my mind",
};

function Timeline({ sub }: { sub: DetailSub }) {
  if (sub.status === "cancelled" || sub.status === "expired") {
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <X size={15} className="text-crimson" /> {sub.status === "cancelled" ? `Cancelled ${formatDate(sub.cancelled_at)}${sub.cancel_reason ? `: ${sub.cancel_reason}` : ""}` : "Payment not completed"}
        {sub.refund_status === "pending" && <span className="font-semibold text-foreground">· Refund in progress</span>}
      </p>
    );
  }
  const steps = [
    { key: "placed", label: "Order placed", date: sub.created_at, done: true },
    { key: "processing", label: "Being prepared", date: null, done: ["processing", "shipped", "delivered", "completed", "returned"].includes(sub.status) },
    { key: "shipped", label: "Shipped", date: sub.shipped_at, done: Boolean(sub.shipped_at) },
    { key: "delivered", label: "Delivered", date: sub.delivered_at, done: Boolean(sub.delivered_at) },
  ];
  if (sub.status === "returned") steps.push({ key: "returned", label: "Returned", date: sub.returned_at, done: true });

  return (
    <ol className="flex flex-col gap-0 sm:flex-row">
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-start gap-2 sm:flex-col sm:items-center sm:text-center">
          <div className="flex items-center sm:w-full">
            <span className={cn("hidden h-0.5 flex-1 sm:block", i === 0 ? "bg-transparent" : steps[i].done ? "bg-emerald-500" : "bg-border")} />
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", s.done ? "bg-emerald-500 text-white" : "bg-border text-muted")}>
              {s.done ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-muted" />}
            </span>
            <span className={cn("hidden h-0.5 flex-1 sm:block", i === steps.length - 1 ? "bg-transparent" : steps[i + 1].done ? "bg-emerald-500" : "bg-border")} />
          </div>
          <div className="pb-3 text-[12px] sm:pt-1.5 sm:pb-0">
            <p className={cn("font-semibold", !s.done && "text-muted")}>{s.label}</p>
            {s.date && <p className="text-muted">{formatDate(s.date)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const { data, isLoading, error } = useAccountList<Order>("order", `/account/orders/${id}`);
  const order = data?.data;

  const [cancelling, setCancelling] = useState<DetailSub | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [returning, setReturning] = useState<{ sub: DetailSub; item: DetailItem } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["order"] });
    void client.invalidateQueries({ queryKey: ["orders"] });
    void client.invalidateQueries({ queryKey: ["account-overview"] });
  };

  async function cancel() {
    if (!cancelling || !order) return;
    setBusy(true);
    try {
      const res = await api<{ message: string }>(`/account/orders/${order.id}/sub-orders/${cancelling.id}/cancel`, { method: "POST", body: { reason: cancelReason || "Changed my mind" } });
      toast.success(res.message);
      setCancelling(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not cancel."));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <AccountCard title="Order details"><ListSkeleton rows={4} /></AccountCard>;
  if (error || !order) {
    return (
      <AccountCard title="Order details">
        <p className="p-6 text-center text-sm text-muted">
          We couldn&apos;t find this order. <Link href="/account/orders" className="font-semibold text-crimson">Back to orders</Link>
        </p>
      </AccountCard>
    );
  }

  const subs = order.sub_orders as DetailSub[];
  const address = order.shipping_snapshot;
  const itemCount = subs.reduce((n, s) => n + s.items.reduce((m, i) => m + i.quantity, 0), 0);

  return (
    <div className="space-y-3">
      <AccountCard
        title={
          <span className="flex items-center gap-2">
            <Link href="/account/orders" className="text-muted hover:text-foreground" aria-label="Back to orders">
              ←
            </Link>
            Order details
          </span>
        }
        bodyClassName="p-4"
      >
        <div className="border-b border-border pb-3 text-[13px]">
          <p className="text-[15px] font-semibold">Order nº {order.order_number}</p>
          <p className="text-muted">
            {itemCount} item{itemCount === 1 ? "" : "s"} · Placed on {formatDate(order.created_at)}
          </p>
          <p className="mt-0.5">
            Total: <span className="font-bold">{formatNaira(order.total)}</span>
          </p>
          {order.payment_status !== "paid" && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-amber-900">
              {order.payment_status === "pending" ? "Payment not confirmed yet. Unpaid orders are cancelled after 30 minutes." : "This order was not paid, so nothing was charged."}
            </p>
          )}
        </div>

        <p className="mt-4 mb-2 text-[12px] font-bold tracking-wide uppercase">Items in your order</p>
        <div className="space-y-3">
          {subs.map((sub, index) => (
            <div key={sub.id} className="rounded-md border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-[13px]">
                <span>
                  <span className="font-semibold">Package {index + 1}</span> · sold by{" "}
                  {sub.store ? (
                    <Link href={`/makers/${sub.store.slug}`} className="text-burgundy hover:underline">
                      {sub.store.name}
                    </Link>
                  ) : (
                    "seller"
                  )}
                </span>
                <StatusBadge status={order.payment_status === "paid" ? sub.status : order.payment_status} label={order.payment_status === "paid" && sub.status === "paid" ? "Confirmed" : undefined} />
              </div>
              <div className="px-3 pt-3">
                <Timeline sub={sub} />
                {sub.tracking_number && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px]">
                    <Truck size={14} className="text-burgundy" /> Tracking number: <span className="font-semibold">{sub.tracking_number}</span>
                  </p>
                )}
              </div>
              <ul className="divide-y divide-border">
                {(sub.items as DetailItem[]).map((item) => (
                  <li key={item.id} className="flex flex-wrap gap-3 p-3">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-surface">
                      <AppImage src={item.image ?? item.product?.images?.[0]?.url} alt="" fill sizes="64px" frameClassName="absolute inset-0" />
                    </span>
                    <div className="min-w-0 flex-1 text-[13px]">
                      {item.product?.slug ? (
                        <Link href={`/product/${item.product.slug}`} className="line-clamp-2 hover:text-burgundy">
                          {item.product_name}
                        </Link>
                      ) : (
                        <p className="line-clamp-2">{item.product_name}</p>
                      )}
                      {item.variant_name && <p className="text-muted">{item.variant_name}</p>}
                      <p className="text-muted">QTY: {item.quantity}</p>
                      <p className="font-semibold">{formatNaira(item.total)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {item.can_review && !item.reviewed && item.product?.slug && (
                        <Link href={`/product/${item.product.slug}#reviews`} className="rounded-md bg-crimson px-3 py-1.5 text-[12px] font-bold text-white uppercase hover:bg-crimson-hover">
                          Rate this product
                        </Link>
                      )}
                      {(item.returnable_quantity ?? 0) > 0 && (
                        <button type="button" onClick={() => setReturning({ sub, item })} className="rounded-md border border-crimson px-3 py-1.5 text-[12px] font-bold text-crimson uppercase hover:bg-crimson/5">
                          Return item
                        </button>
                      )}
                      {item.product?.slug && (
                        <Link href={`/product/${item.product.slug}`} className="text-[12px] font-semibold text-crimson uppercase">
                          Buy again
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {(sub.can_cancel || sub.return_deadline) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-[12px] text-muted">
                  {sub.return_deadline ? <span>Returns open until {formatDate(sub.return_deadline)}</span> : <span />}
                  {sub.can_cancel && (
                    <button type="button" onClick={() => setCancelling(sub)} className="font-bold text-crimson uppercase hover:underline">
                      Cancel this package
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border">
            <p className="border-b border-border px-3 py-2 text-[12px] font-bold tracking-wide uppercase">Payment information</p>
            <dl className="space-y-1 p-3 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">Payment method</dt><dd>Paystack</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Items total</dt><dd>{formatNaira(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery fees</dt><dd>{formatNaira(order.shipping_total)}</dd></div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>Voucher {order.coupon_code}</dt><dd>-{formatNaira(order.discount_total!)}</dd></div>
              )}
              <div className="flex justify-between border-t border-border pt-1 font-bold"><dt>Total</dt><dd>{formatNaira(order.total)}</dd></div>
            </dl>
          </div>
          <div className="rounded-md border border-border">
            <p className="border-b border-border px-3 py-2 text-[12px] font-bold tracking-wide uppercase">Delivery information</p>
            <div className="p-3 text-[13px]">
              <p className="font-semibold">Door delivery</p>
              {address && (
                <p className="mt-1 text-muted">
                  {address.full_name}
                  <br />
                  {address.address_line}, {address.city}, {address.state}
                  <br />
                  {address.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </AccountCard>

      <Modal
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Cancel package"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={busy}>
              Keep it
            </Button>
            <Button onClick={() => void cancel()} loading={busy}>
              Cancel package
            </Button>
          </>
        }
      >
        <p className="text-sm">Why are you cancelling? If you&apos;ve paid, the full amount for this package is refunded to your payment method.</p>
        <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-3 h-10 w-full rounded-md border border-border px-2 text-sm" aria-label="Reason">
          <option value="">Choose a reason</option>
          <option>Changed my mind</option>
          <option>Found a better price</option>
          <option>Ordered by mistake</option>
          <option>Delivery takes too long</option>
          <option>Other</option>
        </select>
      </Modal>

      {returning && (
        <ReturnModal
          sub={returning.sub}
          item={returning.item}
          onClose={() => setReturning(null)}
          onDone={() => {
            setReturning(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ReturnModal({ item, onClose, onDone }: { sub: DetailSub; item: DetailItem; onClose: () => void; onDone: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const needsPhotos = ["damaged", "wrong_item", "not_as_described"].includes(reason);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) {
      setErrors({ reason: "Choose a reason." });
      return;
    }
    if (needsPhotos && photos.length === 0) {
      setErrors({ photos: "Add at least one photo showing the problem." });
      return;
    }
    setBusy(true);
    try {
      await api("/account/returns", { method: "POST", body: { order_item_id: item.id, quantity, reason, details: details || undefined, photos } });
      toast.success("Return requested. The seller will respond within 2 business days.", { label: "Track returns", href: "/account/returns" });
      onDone();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Could not request the return."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Return an item">
      <form onSubmit={submit} className="space-y-3 text-sm">
        <p className="font-medium">{item.product_name}</p>
        {(item.returnable_quantity ?? 1) > 1 && (
          <label className="block">
            <span className="text-[13px] font-medium">Quantity to return</span>
            <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 h-10 w-full rounded-md border border-border px-2">
              {Array.from({ length: item.returnable_quantity ?? 1 }, (_, i) => i + 1).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-[13px] font-medium">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-border px-2">
            <option value="">Choose a reason</option>
            {Object.entries(RETURN_REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {errors.reason && <span className="text-xs text-crimson">{errors.reason}</span>}
        </label>
        <Textarea label="Tell us more (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={3} />
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium">
            <ImagePlus size={15} /> Photos {needsPhotos && <span className="text-crimson">*</span>}
          </p>
          <ImageUploader value={photos} onChange={setPhotos} purpose="return" max={5} />
          {errors.photos && <span className="text-xs text-crimson">{errors.photos}</span>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Request return
          </Button>
        </div>
      </form>
    </Modal>
  );
}
